//! Auth service — all business logic for registration, sign-in, OTP, and password reset.
//!
//! Flow summary:
//!
//! REGISTRATION (4 steps):
//!   1. POST /auth/register/step1  → cache personal details in Redis
//!   2. POST /auth/register/step2  → cache contact + hashed password in Redis
//!   3. POST /auth/otp/send        → generate + deliver OTP (SMS + WhatsApp)
//!   4. POST /auth/otp/verify      → verify OTP → issue otp_token
//!   5. POST /auth/register/step3  → cache language preference
//!   6. POST /auth/register/step4  → cache interests + T&Cs → create user in DB
//!
//! SIGN IN:
//!   POST /auth/signin → verify password → issue token pair
//!
//! PASSWORD RESET:
//!   1. POST /auth/forgot-password → send OTP to phone
//!   2. POST /auth/otp/verify      → verify OTP → issue otp_token
//!   3. POST /auth/reset-password  → validate otp_token → update password hash
//!
//! TOKEN REFRESH:
//!   POST /auth/refresh → validate refresh token → issue new pair (rotation)
//!
//! SIGN OUT:
//!   POST /auth/signout → blacklist refresh token jti

use chrono::{Duration, Utc};
use redis::aio::ConnectionManager;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    config::Config,
    errors::{AppError, AppResult},
    models::user::{
        AuthResponse, CreateUserPayload, ForgotPasswordRequest, MessageResponse,
        OtpPurpose, OtpSentResponse, OtpVerifiedResponse, RefreshTokenRequest,
        RegisterStep1Request, RegisterStep2Request, RegisterStep3Request,
        RegisterStep4Request, RegistrationSession, ResetPasswordRequest,
        SignInRequest, TokenRefreshResponse, UserProfile,
    },
    notifications::{sms, whatsapp},
    repositories::users as user_repo,
    utils::{
        codes::{
            self, check_otp_rate_limit, consume_otp_token, generate_and_store_otp,
            issue_otp_token, mark_phone_verified, clear_phone_verified,
            is_phone_verified, verify_otp, OtpPurpose as CodeOtpPurpose,
        },
        hashing,
        jwt::{
            self, blacklist_refresh_jti, generate_token_pair,
            is_refresh_jti_blacklisted, validate_refresh_token,
        },
    },
};

// ── Registration session TTL ──────────────────────────────────────────────────

const REG_SESSION_TTL_SECONDS: u64 = 1800; // 30 minutes to complete registration

// ── Registration ──────────────────────────────────────────────────────────────

/// Step 1: Validate and cache personal details.
/// Does not touch the DB — just stores in Redis under reg_session:{phone_placeholder}.
/// Phone is not known yet so we use a temp session key returned to client.
pub async fn register_step1(
    redis: &mut ConnectionManager,
    payload: RegisterStep1Request,
) -> AppResult<MessageResponse> {
    // Validate date of birth format DD/MM/YYYY
    validate_date_of_birth(&payload.date_of_birth)?;

    // Generate a temporary session key for this registration attempt
    let session_key = format!("reg_step1:{}", Uuid::new_v4());

    let partial = serde_json::json!({
        "first_name": payload.first_name.trim(),
        "last_name": payload.last_name.trim(),
        "date_of_birth": payload.date_of_birth,
        "gender": payload.gender,
    });

    redis::cmd("SETEX")
        .arg(&session_key)
        .arg(REG_SESSION_TTL_SECONDS)
        .arg(partial.to_string())
        .query_async::<_, ()>(redis)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis step1 cache failed: {}", e)))?;

    Ok(MessageResponse {
        message: session_key, // returned to client to pass forward to step 2
    })
}

/// Step 2: Validate contact details + hash password, extend session cache.
pub async fn register_step2(
    pool: &PgPool,
    redis: &mut ConnectionManager,
    step1_key: &str,
    payload: RegisterStep2Request,
    config: &Config,
) -> AppResult<MessageResponse> {
    // Retrieve step 1 data
    let step1_json: Option<String> = redis::cmd("GET")
        .arg(step1_key)
        .query_async(redis)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis step1 get failed: {}", e)))?;

    let step1_json = step1_json.ok_or_else(|| {
        AppError::BadRequest("Registration session expired. Please start again.".to_string())
    })?;

    // Normalise phone
    let phone = crate::models::user::normalise_sa_phone(&payload.phone);

    // Validate phone format
    if !crate::models::user::is_valid_sa_phone(&phone) {
        return Err(AppError::BadRequest("Invalid SA mobile number".to_string()));
    }

    // Check phone not already registered
    if user_repo::phone_exists(pool, &phone).await? {
        return Err(AppError::Conflict(
            "This phone number is already registered".to_string(),
        ));
    }

    // Check email not already registered
    if let Some(ref email) = payload.email {
        if user_repo::email_exists(pool, email).await? {
            return Err(AppError::Conflict(
                "This email address is already registered".to_string(),
            ));
        }
    }

    // Validate passwords match
    if payload.password != payload.confirm_password {
        return Err(AppError::BadRequest("Passwords do not match".to_string()));
    }

    // Validate password strength
    validate_password_strength(&payload.password)?;

    // Hash password
    let password_hash = hashing::hash(&payload.password)?;

    // Build merged session
    let session_key = format!("reg_session:{}", phone);

    let step1: serde_json::Value = serde_json::from_str(&step1_json)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Step1 parse failed: {}", e)))?;

    let session = serde_json::json!({
        "phone": phone,
        "first_name": step1["first_name"],
        "last_name": step1["last_name"],
        "date_of_birth": step1["date_of_birth"],
        "gender": step1["gender"],
        "email": payload.email,
        "password_hash": password_hash,
        "language": "en",  // default — overridden in step 3
        "theme": "obsidian",
        "interests": [],
    });

    redis::cmd("SETEX")
        .arg(&session_key)
        .arg(REG_SESSION_TTL_SECONDS)
        .arg(session.to_string())
        .query_async::<_, ()>(redis)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis session store failed: {}", e)))?;

    // Clean up step1 temp key
    redis::cmd("DEL")
        .arg(step1_key)
        .query_async::<_, ()>(redis)
        .await
        .ok(); // non-critical

    Ok(MessageResponse {
        message: phone, // return normalised phone — client uses this for OTP step
    })
}

/// Step 3: Cache language preference.
/// Called after OTP verification succeeds.
pub async fn register_step3(
    redis: &mut ConnectionManager,
    phone: &str,
    payload: RegisterStep3Request,
) -> AppResult<MessageResponse> {
    ensure_phone_verified(redis, phone).await?;

    let session_key = format!("reg_session:{}", phone);

    let session_json: Option<String> = redis::cmd("GET")
        .arg(&session_key)
        .query_async(redis)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis session get failed: {}", e)))?;

    let session_json = session_json.ok_or_else(|| {
        AppError::BadRequest("Registration session expired. Please start again.".to_string())
    })?;

    let mut session: serde_json::Value = serde_json::from_str(&session_json)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Session parse failed: {}", e)))?;

    session["language"] = serde_json::json!(payload.language.as_str());

    redis::cmd("SETEX")
        .arg(&session_key)
        .arg(REG_SESSION_TTL_SECONDS)
        .arg(session.to_string())
        .query_async::<_, ()>(redis)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis session update failed: {}", e)))?;

    Ok(MessageResponse {
        message: "Language preference saved".to_string(),
    })
}

/// Step 4: Final step — save interests + T&Cs, create user in DB, issue tokens.
pub async fn register_step4(
    pool: &PgPool,
    redis: &mut ConnectionManager,
    phone: &str,
    payload: RegisterStep4Request,
    config: &Config,
) -> AppResult<AuthResponse> {
    ensure_phone_verified(redis, phone).await?;

    // Validate T&Cs accepted
    if !payload.terms_accepted {
        return Err(AppError::BadRequest(
            "You must accept the Terms of Service, Privacy Policy, and POPIA Notice".to_string(),
        ));
    }

    // Validate at least one interest
    if payload.interests.is_empty() {
        return Err(AppError::BadRequest(
            "Please select at least one stokvel interest".to_string(),
        ));
    }

    // Retrieve full session
    let session_key = format!("reg_session:{}", phone);

    let session_json: Option<String> = redis::cmd("GET")
        .arg(&session_key)
        .query_async(redis)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis session get failed: {}", e)))?;

    let session_json = session_json.ok_or_else(|| {
        AppError::BadRequest("Registration session expired. Please start again.".to_string())
    })?;

    let session: serde_json::Value = serde_json::from_str(&session_json)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Session parse failed: {}", e)))?;

    // Build create payload
    let first_name = session["first_name"].as_str().unwrap_or("").trim().to_string();
    let last_name = session["last_name"].as_str().unwrap_or("").trim().to_string();

    let create_payload = CreateUserPayload {
        phone: phone.to_string(),
        email: session["email"].as_str().map(|s| s.to_string()),
        full_name: format!("{} {}", first_name, last_name),
        date_of_birth: session["date_of_birth"]
            .as_str()
            .unwrap_or("")
            .to_string(),
        gender: session["gender"].as_str().unwrap_or("prefer_not_to_say").to_string(),
        password_hash: session["password_hash"]
            .as_str()
            .ok_or_else(|| AppError::Internal(anyhow::anyhow!("Password hash missing from session")))?
            .to_string(),
        language: session["language"].as_str().unwrap_or("en").to_string(),
        theme: payload
            .theme
            .as_ref()
            .map(|t| t.as_str().to_string())
            .unwrap_or_else(|| "obsidian".to_string()),
        interests: payload.interests.iter().map(|i| i.as_str().to_string()).collect(),
    };

    // Create user + wallet + fair score + fraud settings in DB (transaction)
    let user = user_repo::create(pool, create_payload).await?;

    // Clean up Redis session
    redis::cmd("DEL")
        .arg(&session_key)
        .query_async::<_, ()>(redis)
        .await
        .ok();

    clear_phone_verified(redis, phone).await.ok();

    // Issue token pair
    let token_pair = generate_token_pair(
        user.id,
        &user.phone,
        user.is_kyc_verified,
        &config.jwt_secret,
        config.jwt_expiry_hours,
        config.refresh_token_expiry_days,
    )?;

    // Store refresh token in DB
    let refresh_expires_at =
        Utc::now() + Duration::days(config.refresh_token_expiry_days);
    user_repo::store_refresh_token(
        pool,
        user.id,
        token_pair.refresh_jti,
        &hashing::hash(&token_pair.refresh_token)?,
        refresh_expires_at,
    )
    .await?;

    tracing::info!(user_id = %user.id, "Registration complete");

    Ok(AuthResponse {
        access_token: token_pair.access_token,
        refresh_token: token_pair.refresh_token,
        user: UserProfile::from(user),
    })
}

// ── OTP ───────────────────────────────────────────────────────────────────────

/// Send an OTP to a phone number via SMS and WhatsApp.
pub async fn send_otp(
    pool: &PgPool,
    redis: &mut ConnectionManager,
    phone: &str,
    purpose: OtpPurpose,
    config: &Config,
) -> AppResult<OtpSentResponse> {
    let phone = crate::models::user::normalise_sa_phone(phone);

    if !crate::models::user::is_valid_sa_phone(&phone) {
        return Err(AppError::BadRequest("Invalid SA mobile number".to_string()));
    }

    // For registration: phone must NOT already exist
    if purpose == OtpPurpose::Register && user_repo::phone_exists(pool, &phone).await? {
        return Err(AppError::Conflict(
            "This phone number is already registered".to_string(),
        ));
    }

    // For password reset: phone MUST exist
    if purpose == OtpPurpose::ResetPassword && !user_repo::phone_exists(pool, &phone).await? {
        // Return generic message to prevent phone enumeration
        return Ok(OtpSentResponse {
            message: "If this number is registered, you will receive an OTP shortly".to_string(),
            expires_in_seconds: 300,
            debug_otp: None,
        });
    }

    // Rate limit check
    let code_purpose = map_otp_purpose(&purpose);
    let within_limit = check_otp_rate_limit(redis, &phone, &code_purpose).await?;
    if !within_limit {
        return Err(AppError::BadRequest(
            "Too many OTP requests. Please wait 10 minutes before trying again.".to_string(),
        ));
    }

    // Generate OTP
    let otp = generate_and_store_otp(redis, &phone, &code_purpose).await?;

    // Build localised message
    let message = otp_message(&otp, &purpose);

    // Deliver via SMS
    if let Err(e) = sms::send(&phone, &message, config).await {
        tracing::error!(phone = %phone, error = %e, "SMS delivery failed");
        // Don't fail the request — WhatsApp delivery below may still work
    }

    // Deliver via WhatsApp
    if let Err(e) = whatsapp::send(&phone, &message, config).await {
        tracing::error!(phone = %phone, error = %e, "WhatsApp delivery failed");
    }

    // In non-production: include OTP in response for testing
    let debug_otp = if !config.is_production() {
        Some(otp.clone())
    } else {
        None
    };

    Ok(OtpSentResponse {
        message: "OTP sent via SMS and WhatsApp".to_string(),
        expires_in_seconds: 300,
        debug_otp,
    })
}

/// Verify an OTP. On success, issues a short-lived otp_token for the next step.
pub async fn verify_otp_code(
    redis: &mut ConnectionManager,
    phone: &str,
    purpose: OtpPurpose,
    code: &str,
) -> AppResult<OtpVerifiedResponse> {
    let phone = crate::models::user::normalise_sa_phone(phone);
    let code_purpose = map_otp_purpose(&purpose);

    let valid = verify_otp(redis, &phone, &code_purpose, code).await?;

    if !valid {
        return Err(AppError::BadRequest(
            "Invalid or expired OTP. Please request a new one.".to_string(),
        ));
    }

    // Mark phone as verified in Redis
    mark_phone_verified(redis, &phone).await?;

    // Issue short-lived otp_token authorising the next step
    let otp_token = issue_otp_token(redis, &phone).await?;

    Ok(OtpVerifiedResponse {
        otp_token,
        message: "Phone number verified successfully".to_string(),
    })
}

// ── Sign In ───────────────────────────────────────────────────────────────────

pub async fn sign_in(
    pool: &PgPool,
    redis: &mut ConnectionManager,
    payload: SignInRequest,
    device_id: Option<&str>,
    ip_address: Option<&str>,
    user_agent: Option<&str>,
    config: &Config,
) -> AppResult<AuthResponse> {
    // Find user by phone or email
    let user = user_repo::find_by_identifier(pool, &payload.identifier)
        .await?
        .ok_or_else(|| AppError::BadRequest("Invalid credentials".to_string()))?;

    // Verify password
    let password_hash = user.password_hash.as_deref().ok_or_else(|| {
        AppError::BadRequest("Invalid credentials".to_string())
    })?;

    let valid = hashing::verify(&payload.password, password_hash)?;
    if !valid {
        tracing::warn!(phone = %user.phone, "Failed sign-in attempt");
        return Err(AppError::BadRequest("Invalid credentials".to_string()));
    }

    // Check account is active
    if !user.is_active {
        return Err(AppError::Forbidden);
    }

    // Issue token pair
    let token_pair = generate_token_pair(
        user.id,
        &user.phone,
        user.is_kyc_verified,
        &config.jwt_secret,
        config.jwt_expiry_hours,
        config.refresh_token_expiry_days,
    )?;

    // Store refresh token
    let refresh_expires_at =
        Utc::now() + Duration::days(config.refresh_token_expiry_days);
    user_repo::store_refresh_token(
        pool,
        user.id,
        token_pair.refresh_jti,
        &hashing::hash(&token_pair.refresh_token)?,
        refresh_expires_at,
    )
    .await?;

    // Upsert session record
    if let Some(did) = device_id {
        user_repo::upsert_session(pool, user.id, did, ip_address, user_agent)
            .await
            .ok(); // non-critical
    }

    tracing::info!(user_id = %user.id, "User signed in");

    Ok(AuthResponse {
        access_token: token_pair.access_token,
        refresh_token: token_pair.refresh_token,
        user: UserProfile::from(user),
    })
}

// ── Password Reset ────────────────────────────────────────────────────────────

/// Initiate forgot password — send OTP to phone.
pub async fn forgot_password(
    pool: &PgPool,
    redis: &mut ConnectionManager,
    payload: ForgotPasswordRequest,
    config: &Config,
) -> AppResult<OtpSentResponse> {
    send_otp(
        pool,
        redis,
        &payload.phone,
        OtpPurpose::ResetPassword,
        config,
    )
    .await
}

/// Reset password — validate otp_token then update hash.
pub async fn reset_password(
    pool: &PgPool,
    redis: &mut ConnectionManager,
    payload: ResetPasswordRequest,
) -> AppResult<MessageResponse> {
    let phone = crate::models::user::normalise_sa_phone(&payload.phone);

    // Validate passwords match
    if payload.new_password != payload.confirm_new_password {
        return Err(AppError::BadRequest("Passwords do not match".to_string()));
    }

    // Validate password strength
    validate_password_strength(&payload.new_password)?;

    // Consume the otp_token — single use, proves OTP was verified
    let valid = consume_otp_token(redis, &payload.otp_token, &phone).await?;
    if !valid {
        return Err(AppError::BadRequest(
            "Invalid or expired reset token. Please request a new OTP.".to_string(),
        ));
    }

    // Find user
    let user = user_repo::find_by_phone(pool, &phone)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    // Hash new password
    let new_hash = hashing::hash(&payload.new_password)?;

    // Update in DB
    user_repo::update_password_hash(pool, user.id, &new_hash).await?;

    // Revoke all existing refresh tokens — force re-login everywhere
    user_repo::revoke_all_refresh_tokens(pool, user.id).await?;

    tracing::info!(user_id = %user.id, "Password reset successful");

    Ok(MessageResponse {
        message: "Password reset successfully. Please sign in with your new password.".to_string(),
    })
}

// ── Token Refresh ─────────────────────────────────────────────────────────────

/// Rotate refresh tokens — invalidate old, issue new pair.
pub async fn refresh_tokens(
    pool: &PgPool,
    redis: &mut ConnectionManager,
    payload: RefreshTokenRequest,
    config: &Config,
) -> AppResult<TokenRefreshResponse> {
    // Validate refresh token
    let claims = validate_refresh_token(&payload.refresh_token, &config.jwt_secret)?;

    // Check jti not blacklisted
    if is_refresh_jti_blacklisted(redis, claims.jti).await? {
        tracing::warn!(user_id = %claims.sub, jti = %claims.jti, "Blacklisted refresh token used");
        return Err(AppError::Unauthorized);
    }

    // Find user
    let user = user_repo::find_by_id(pool, claims.sub)
        .await?
        .ok_or(AppError::Unauthorized)?;

    if !user.is_active {
        return Err(AppError::Unauthorized);
    }

    // Blacklist old jti (token rotation — old token can never be reused)
    let ttl = (claims.exp - Utc::now().timestamp()).max(0) as u64;
    blacklist_refresh_jti(redis, claims.jti, ttl).await?;

    // Revoke old token from DB
    user_repo::revoke_refresh_token(pool, claims.jti).await.ok();

    // Issue new pair
    let token_pair = generate_token_pair(
        user.id,
        &user.phone,
        user.is_kyc_verified,
        &config.jwt_secret,
        config.jwt_expiry_hours,
        config.refresh_token_expiry_days,
    )?;

    // Store new refresh token
    let refresh_expires_at =
        Utc::now() + Duration::days(config.refresh_token_expiry_days);
    user_repo::store_refresh_token(
        pool,
        user.id,
        token_pair.refresh_jti,
        &hashing::hash(&token_pair.refresh_token)?,
        refresh_expires_at,
    )
    .await?;

    Ok(TokenRefreshResponse {
        access_token: token_pair.access_token,
        refresh_token: token_pair.refresh_token,
    })
}

// ── Sign Out ──────────────────────────────────────────────────────────────────

/// Sign out — blacklist refresh token jti and revoke from DB.
pub async fn sign_out(
    pool: &PgPool,
    redis: &mut ConnectionManager,
    refresh_token: &str,
    config: &Config,
) -> AppResult<MessageResponse> {
    // Validate refresh token to extract jti
    // If invalid we still return success — idempotent sign out
    let claims = match validate_refresh_token(refresh_token, &config.jwt_secret) {
        Ok(c) => c,
        Err(_) => {
            return Ok(MessageResponse {
                message: "Signed out successfully".to_string(),
            });
        }
    };

    let ttl = (claims.exp - Utc::now().timestamp()).max(0) as u64;
    blacklist_refresh_jti(redis, claims.jti, ttl).await.ok();
    user_repo::revoke_refresh_token(pool, claims.jti).await.ok();

    tracing::info!(user_id = %claims.sub, "User signed out");

    Ok(MessageResponse {
        message: "Signed out successfully".to_string(),
    })
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Ensure phone has been OTP-verified before proceeding with registration steps.
async fn ensure_phone_verified(
    redis: &mut ConnectionManager,
    phone: &str,
) -> AppResult<()> {
    let verified = is_phone_verified(redis, phone).await?;
    if !verified {
        return Err(AppError::BadRequest(
            "Phone number not verified. Please complete OTP verification first.".to_string(),
        ));
    }
    Ok(())
}

/// Map model OtpPurpose to utils::codes::OtpPurpose.
fn map_otp_purpose(purpose: &OtpPurpose) -> CodeOtpPurpose {
    match purpose {
        OtpPurpose::Register      => CodeOtpPurpose::Register,
        OtpPurpose::ResetPassword => CodeOtpPurpose::ResetPassword,
        OtpPurpose::Withdraw      => CodeOtpPurpose::Withdraw,
    }
}

/// Build a localised OTP message.
/// TODO: expand with full i18n once language is known at this stage.
fn otp_message(otp: &str, purpose: &OtpPurpose) -> String {
    match purpose {
        OtpPurpose::Register => {
            format!(
                "Welcome to StockFair! Your verification code is: {}. Valid for 5 minutes. Do not share this code with anyone.",
                otp
            )
        }
        OtpPurpose::ResetPassword => {
            format!(
                "StockFair password reset code: {}. Valid for 5 minutes. If you did not request this, please ignore.",
                otp
            )
        }
        OtpPurpose::Withdraw => {
            format!(
                "StockFair withdrawal authorisation code: {}. Valid for 5 minutes. Never share this code.",
                otp
            )
        }
    }
}

/// Validate password strength.
/// Requires: min 8 chars, at least one uppercase, one digit.
fn validate_password_strength(password: &str) -> AppResult<()> {
    if password.len() < 8 {
        return Err(AppError::BadRequest(
            "Password must be at least 8 characters".to_string(),
        ));
    }
    if !password.chars().any(|c| c.is_uppercase()) {
        return Err(AppError::BadRequest(
            "Password must contain at least one uppercase letter".to_string(),
        ));
    }
    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Err(AppError::BadRequest(
            "Password must contain at least one number".to_string(),
        ));
    }
    Ok(())
}

/// Validate DD/MM/YYYY date of birth format.
fn validate_date_of_birth(dob: &str) -> AppResult<()> {
    let parts: Vec<&str> = dob.split('/').collect();
    if parts.len() != 3 {
        return Err(AppError::BadRequest(
            "Date of birth must be in DD/MM/YYYY format".to_string(),
        ));
    }
    let day: u32 = parts[0].parse().map_err(|_| {
        AppError::BadRequest("Invalid date of birth".to_string())
    })?;
    let month: u32 = parts[1].parse().map_err(|_| {
        AppError::BadRequest("Invalid date of birth".to_string())
    })?;
    let year: u32 = parts[2].parse().map_err(|_| {
        AppError::BadRequest("Invalid date of birth".to_string())
    })?;

    if day < 1 || day > 31 {
        return Err(AppError::BadRequest("Invalid day in date of birth".to_string()));
    }
    if month < 1 || month > 12 {
        return Err(AppError::BadRequest("Invalid month in date of birth".to_string()));
    }

    let current_year = Utc::now().year() as u32;
    if year < 1900 || year > current_year - 18 {
        return Err(AppError::BadRequest(
            "You must be at least 18 years old to use StockFair".to_string(),
        ));
    }

    Ok(())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_password_strength() {
        assert!(validate_password_strength("SecurePass1").is_ok());
        assert!(validate_password_strength("short1A").is_err());    // too short
        assert!(validate_password_strength("alllowercase1").is_err()); // no uppercase
        assert!(validate_password_strength("NoDigitsHere").is_err()); // no digit
    }

    #[test]
    fn test_validate_date_of_birth() {
        assert!(validate_date_of_birth("15/06/1990").is_ok());
        assert!(validate_date_of_birth("15-06-1990").is_err()); // wrong format
        assert!(validate_date_of_birth("32/01/1990").is_err()); // invalid day
        assert!(validate_date_of_birth("01/13/1990").is_err()); // invalid month
        assert!(validate_date_of_birth("01/01/2020").is_err()); // under 18
    }

    #[test]
    fn test_otp_message_contains_code() {
        let otp = "482931";
        let msg = otp_message(otp, &OtpPurpose::Register);
        assert!(msg.contains(otp));
        let msg = otp_message(otp, &OtpPurpose::ResetPassword);
        assert!(msg.contains(otp));
        let msg = otp_message(otp, &OtpPurpose::Withdraw);
        assert!(msg.contains(otp));
    }
}

