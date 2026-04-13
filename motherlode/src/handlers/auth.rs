//! Auth handlers — HTTP layer for all auth endpoints.
//!
//! Handlers are thin. They:
//!   1. Extract request data
//!   2. Call the service layer
//!   3. Return HTTP responses
//!
//! No business logic lives here.

use axum::{
    extract::{Json, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use sqlx::types::ipnetwork::IpNetwork;
use serde_json::json;
use validator::Validate;

use crate::{
    errors::AppResult,
    models::user::{
        ForgotPasswordRequest, RefreshTokenRequest, RegisterStep1Request,
        RegisterStep2Request, RegisterStep3Request, RegisterStep4Request,
        ResetPasswordRequest, SendOtpRequest, SignInRequest, VerifyOtpRequest,
    },
    routes::AppState,
    services::auth as auth_service,
};

// ── Registration ──────────────────────────────────────────────────────────────

/// POST /auth/register/step1
/// Personal details — first name, last name, DOB, gender.
pub async fn register_step1(
    State(state): State<AppState>,
    Json(payload): Json<RegisterStep1Request>,
) -> AppResult<impl IntoResponse> {
    payload.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    let result = auth_service::register_step1(&mut redis, payload).await?;

    Ok((
        StatusCode::OK,
        Json(json!({
            "session_key": result.message,
            "message": "Personal details saved. Proceed to step 2."
        })),
    ))
}

/// POST /auth/register/step2
/// Contact details + password. Returns normalised phone for OTP step.
pub async fn register_step2(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<RegisterStep2WithSessionRequest>,
) -> AppResult<impl IntoResponse> {
    payload.inner.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    let result = auth_service::register_step2(
        &state.db,
        &mut redis,
        &payload.session_key,
        payload.inner,
        &state.config,
    )
    .await?;

    Ok((
        StatusCode::OK,
        Json(json!({
            "phone": result.message,
            "message": "Contact details saved. Please verify your phone number."
        })),
    ))
}

/// POST /auth/register/step3
/// Language preference. Requires phone_verified in Redis.
pub async fn register_step3(
    State(state): State<AppState>,
    Json(payload): Json<RegisterStep3WithPhoneRequest>,
) -> AppResult<impl IntoResponse> {
    payload.inner.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    auth_service::register_step3(&mut redis, &payload.phone, payload.inner).await?;

    Ok((
        StatusCode::OK,
        Json(json!({
            "message": "Language preference saved. Proceed to step 4."
        })),
    ))
}

/// POST /auth/register/step4
/// Stokvel interests + T&Cs. Creates user and returns auth tokens.
pub async fn register_step4(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<RegisterStep4WithPhoneRequest>,
) -> AppResult<impl IntoResponse> {
    payload.inner.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    let result = auth_service::register_step4(
        &state.db,
        &mut redis,
        &payload.phone,
        payload.inner,
        &state.config,
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "user": result.user,
            "message": "Account created successfully. Welcome to StockFair!"
        })),
    ))
}

// ── OTP ───────────────────────────────────────────────────────────────────────

/// POST /auth/otp/send
/// Send OTP via SMS and WhatsApp.
pub async fn send_otp(
    State(state): State<AppState>,
    Json(payload): Json<SendOtpRequest>,
) -> AppResult<impl IntoResponse> {
    payload.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    let result = auth_service::send_otp(
        &state.db,
        &mut redis,
        &payload.phone,
        payload.purpose,
        &state.config,
    )
    .await?;

    Ok((StatusCode::OK, Json(result)))
}

/// POST /auth/otp/verify
/// Verify OTP code. Returns otp_token for next step.
pub async fn verify_otp(
    State(state): State<AppState>,
    Json(payload): Json<VerifyOtpRequest>,
) -> AppResult<impl IntoResponse> {
    payload.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    let result =
        auth_service::verify_otp_code(&mut redis, &payload.phone, payload.purpose, &payload.code)
            .await?;

    Ok((StatusCode::OK, Json(result)))
}

// ── Sign In ───────────────────────────────────────────────────────────────────

/// POST /auth/signin
/// Sign in with phone/email + password.
pub async fn sign_in(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<SignInRequest>,
) -> AppResult<impl IntoResponse> {
    payload.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    // Extract device info from headers for session tracking
    let device_id = headers
        .get("X-Device-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let ip_address = headers
        .get("X-Forwarded-For")
        .or_else(|| headers.get("X-Real-IP"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or(s).trim().to_string());

    let user_agent = headers
        .get("User-Agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let result = auth_service::sign_in(
        &state.db,
        &mut redis,
        payload,
        device_id.as_deref(),
        ip_address.as_ref().and_then(|s| s.parse().ok()),
        user_agent.as_deref(),
        &state.config,
    )
    .await?;

    Ok((
        StatusCode::OK,
        Json(json!({
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "user": result.user
        })),
    ))
}

// ── Password Reset ────────────────────────────────────────────────────────────

/// POST /auth/forgot-password
/// Trigger OTP send for password reset.
pub async fn forgot_password(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordRequest>,
) -> AppResult<impl IntoResponse> {
    payload.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    let result =
        auth_service::forgot_password(&state.db, &mut redis, payload, &state.config).await?;

    Ok((StatusCode::OK, Json(result)))
}

/// POST /auth/reset-password
/// Reset password using otp_token issued after OTP verification.
pub async fn reset_password(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> AppResult<impl IntoResponse> {
    payload.validate().map_err(|e| {
        crate::errors::AppError::BadRequest(format_validation_errors(e))
    })?;

    let mut redis = state.redis.clone();

    let result =
        auth_service::reset_password(&state.db, &mut redis, payload).await?;

    Ok((StatusCode::OK, Json(result)))
}

// ── Token Refresh ─────────────────────────────────────────────────────────────

/// POST /auth/refresh
/// Rotate refresh token — returns new access + refresh token pair.
pub async fn refresh_tokens(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> AppResult<impl IntoResponse> {
    let mut redis = state.redis.clone();

    let result =
        auth_service::refresh_tokens(&state.db, &mut redis, payload, &state.config).await?;

    Ok((StatusCode::OK, Json(result)))
}

// ── Sign Out ──────────────────────────────────────────────────────────────────

/// POST /auth/signout
/// Invalidate refresh token. Client should discard both tokens.
pub async fn sign_out(
    State(state): State<AppState>,
    Json(payload): Json<SignOutRequest>,
) -> AppResult<impl IntoResponse> {
    let mut redis = state.redis.clone();

    let result =
        auth_service::sign_out(&state.db, &mut redis, &payload.refresh_token, &state.config)
            .await?;

    Ok((StatusCode::OK, Json(result)))
}

// ── Health ────────────────────────────────────────────────────────────────────

/// GET /auth/health
/// Simple liveness check for the auth service.
pub async fn health() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({
            "status": "ok",
            "service": "motherlode-auth"
        })),
    )
}

// ── Request wrappers ──────────────────────────────────────────────────────────
// These wrap the core step payloads with session routing fields
// that need to travel alongside the step data.

#[derive(Debug, serde::Deserialize)]
pub struct RegisterStep2WithSessionRequest {
    /// session_key returned from step 1
    pub session_key: String,
    #[serde(flatten)]
    pub inner: RegisterStep2Request,
}

#[derive(Debug, serde::Deserialize)]
pub struct RegisterStep3WithPhoneRequest {
    pub phone: String,
    #[serde(flatten)]
    pub inner: RegisterStep3Request,
}

#[derive(Debug, serde::Deserialize)]
pub struct RegisterStep4WithPhoneRequest {
    pub phone: String,
    #[serde(flatten)]
    pub inner: RegisterStep4Request,
}

#[derive(Debug, serde::Deserialize)]
pub struct SignOutRequest {
    pub refresh_token: String,
}

// ── Validation error formatter ────────────────────────────────────────────────

/// Format validator errors into a clean single string for the client.
fn format_validation_errors(errors: validator::ValidationErrors) -> String {
    errors
        .field_errors()
        .iter()
        .flat_map(|(field, errs)| {
            errs.iter().map(move |e| {
                let msg = e
                    .message
                    .as_ref()
                    .map(|m| m.to_string())
                    .unwrap_or_else(|| format!("Invalid value for '{}'", field));
                format!("{}: {}", field, msg)
            })
        })
        .collect::<Vec<_>>()
        .join(", ")
}

