//! User repository — all database queries for users.
//!
//! Rules:
//!   - No business logic here, only DB queries
//!   - Services call repositories, handlers never touch DB directly
//!   - All queries return AppResult<T>
//!   - Never return password_hash or pin_hash to service layer unless explicitly needed

use chrono::Utc;
use sqlx::PgPool;
use sqlx::types::ipnetwork::IpNetwork;
use uuid::Uuid;
use crate::errors::{AppError, AppResult};
use crate::models::user::{CreateUserPayload, User};

// ── Reads ─────────────────────────────────────────────────────────────────────

pub async fn find_by_id(pool: &PgPool, id: Uuid) -> AppResult<Option<User>> {
    sqlx::query_as!(
        User,
        r#"
        SELECT
            id, phone, email, full_name, avatar_url,
            password_hash, pin_hash, language, theme,
            is_active, is_phone_verified, is_kyc_verified,
            created_at, updated_at
        FROM users
        WHERE id = $1
          AND is_active = true
        "#,
        id
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("find_by_id failed: {}", e)))
}

pub async fn find_by_phone(pool: &PgPool, phone: &str) -> AppResult<Option<User>> {
    sqlx::query_as!(
        User,
        r#"
        SELECT
            id, phone, email, full_name, avatar_url,
            password_hash, pin_hash, language, theme,
            is_active, is_phone_verified, is_kyc_verified,
            created_at, updated_at
        FROM users
        WHERE phone = $1
          AND is_active = true
        "#,
        phone
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("find_by_phone failed: {}", e)))
}

pub async fn find_by_email(pool: &PgPool, email: &str) -> AppResult<Option<User>> {
    sqlx::query_as!(
        User,
        r#"
        SELECT
            id, phone, email, full_name, avatar_url,
            password_hash, pin_hash, language, theme,
            is_active, is_phone_verified, is_kyc_verified,
            created_at, updated_at
        FROM users
        WHERE email = $1
          AND is_active = true
        "#,
        email
    )
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("find_by_email failed: {}", e)))
}

/// Resolve a sign-in identifier — could be phone or email.
/// Tries phone first, then email.
pub async fn find_by_identifier(pool: &PgPool, identifier: &str) -> AppResult<Option<User>> {
    // Detect if identifier looks like a phone number
    let cleaned = identifier.replace([' ', '-'], "");
    if cleaned.starts_with('+') || cleaned.starts_with('0') {
        if let Some(user) = find_by_phone(pool, &cleaned).await? {
            return Ok(Some(user));
        }
    }
    // Fall back to email lookup
    find_by_email(pool, identifier).await
}

pub async fn phone_exists(pool: &PgPool, phone: &str) -> AppResult<bool> {
    let count: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM users WHERE phone = $1",
        phone
    )
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("phone_exists failed: {}", e)))?
    .unwrap_or(0);

    Ok(count > 0)
}

pub async fn email_exists(pool: &PgPool, email: &str) -> AppResult<bool> {
    let count: i64 = sqlx::query_scalar!(
        "SELECT COUNT(*) FROM users WHERE email = $1",
        email
    )
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("email_exists failed: {}", e)))?
    .unwrap_or(0);

    Ok(count > 0)
}

// ── Create ────────────────────────────────────────────────────────────────────

/// Insert a new user and initialise their wallet + fair score in a single transaction.
pub async fn create(pool: &PgPool, payload: CreateUserPayload) -> AppResult<User> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Transaction begin failed: {}", e)))?;

    // Insert user
    let user = sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (
            phone, email, full_name, password_hash,
            language, theme, is_active, is_phone_verified, is_kyc_verified,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, true, true, false, NOW(), NOW())
        RETURNING
            id, phone, email, full_name, avatar_url,
            password_hash, pin_hash, language, theme,
            is_active, is_phone_verified, is_kyc_verified,
            created_at, updated_at
        "#,
        payload.phone,
        payload.email,
        payload.full_name,
        payload.password_hash,
        payload.language,
        payload.theme,
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| {
        if e.to_string().contains("duplicate key") {
            AppError::Conflict("Phone number or email already registered".to_string())
        } else {
            AppError::Internal(anyhow::anyhow!("User insert failed: {}", e))
        }
    })?;

    // Initialise user wallet
    sqlx::query!(
        r#"
        INSERT INTO user_wallets (user_id, balance, updated_at)
        VALUES ($1, 0.00, NOW())
        "#,
        user.id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("Wallet init failed: {}", e)))?;

    // Initialise fair score (starting score: 380 — "Building" tier)
    sqlx::query!(
        r#"
        INSERT INTO fair_scores (
            user_id, score,
            payment_history, consistency, group_activity, member_tenure,
            updated_at
        )
        VALUES ($1, 380, 0, 0, 0, 0, NOW())
        "#,
        user.id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("Fair score init failed: {}", e)))?;

    // Initialise fraud settings (all opt-in, all off by default)
    sqlx::query!(
        r#"
        INSERT INTO fraud_settings (
            user_id,
            behavioral_analytics, sim_swap_detection,
            jailbreak_detection, geofencing,
            updated_at
        )
        VALUES ($1, false, false, false, false, NOW())
        "#,
        user.id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("Fraud settings init failed: {}", e)))?;

    // Initialise feature lock settings (all off by default)
    sqlx::query!(
        r#"
        INSERT INTO feature_lock_settings (
            user_id,
            lock_withdrawals, lock_payments,
            lock_statements, lock_linked_accounts, lock_investments,
            updated_at
        )
        VALUES ($1, false, false, false, false, false, NOW())
        "#,
        user.id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("Feature lock init failed: {}", e)))?;

    tx.commit()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Transaction commit failed: {}", e)))?;

    tracing::info!(user_id = %user.id, phone = %user.phone, "New user created");

    Ok(user)
}

// ── Updates ───────────────────────────────────────────────────────────────────

pub async fn update_password_hash(
    pool: &PgPool,
    user_id: Uuid,
    new_hash: &str,
) -> AppResult<()> {
    sqlx::query!(
        r#"
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2 AND is_active = true
        "#,
        new_hash,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("update_password_hash failed: {}", e)))?;

    Ok(())
}

pub async fn update_pin_hash(
    pool: &PgPool,
    user_id: Uuid,
    new_hash: &str,
) -> AppResult<()> {
    sqlx::query!(
        r#"
        UPDATE users
        SET pin_hash = $1, updated_at = NOW()
        WHERE id = $2 AND is_active = true
        "#,
        new_hash,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("update_pin_hash failed: {}", e)))?;

    Ok(())
}

pub async fn update_profile(
    pool: &PgPool,
    user_id: Uuid,
    full_name: Option<&str>,
    email: Option<&str>,
    language: Option<&str>,
    theme: Option<&str>,
) -> AppResult<User> {
    sqlx::query_as!(
        User,
        r#"
        UPDATE users
        SET
            full_name    = COALESCE($1, full_name),
            email        = COALESCE($2, email),
            language     = COALESCE($3, language),
            theme        = COALESCE($4, theme),
            updated_at   = NOW()
        WHERE id = $5 AND is_active = true
        RETURNING
            id, phone, email, full_name, avatar_url,
            password_hash, pin_hash, language, theme,
            is_active, is_phone_verified, is_kyc_verified,
            created_at, updated_at
        "#,
        full_name,
        email,
        language,
        theme,
        user_id
    )
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("update_profile failed: {}", e)))
}

pub async fn update_avatar(
    pool: &PgPool,
    user_id: Uuid,
    avatar_url: &str,
) -> AppResult<()> {
    sqlx::query!(
        r#"
        UPDATE users
        SET avatar_url = $1, updated_at = NOW()
        WHERE id = $2 AND is_active = true
        "#,
        avatar_url,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("update_avatar failed: {}", e)))?;

    Ok(())
}

pub async fn mark_phone_verified(pool: &PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query!(
        r#"
        UPDATE users
        SET is_phone_verified = true, updated_at = NOW()
        WHERE id = $1
        "#,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("mark_phone_verified failed: {}", e)))?;

    Ok(())
}

pub async fn mark_kyc_verified(pool: &PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query!(
        r#"
        UPDATE users
        SET is_kyc_verified = true, updated_at = NOW()
        WHERE id = $1
        "#,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("mark_kyc_verified failed: {}", e)))?;

    Ok(())
}

/// Soft delete — never hard delete users (audit trail + financial records)
pub async fn deactivate(pool: &PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query!(
        r#"
        UPDATE users
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        "#,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("deactivate failed: {}", e)))?;

    Ok(())
}

// ── Refresh Tokens ────────────────────────────────────────────────────────────

pub async fn store_refresh_token(
    pool: &PgPool,
    user_id: Uuid,
    jti: Uuid,
    token_hash: &str,
    expires_at: chrono::DateTime<Utc>,
) -> AppResult<()> {
    sqlx::query!(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
        VALUES ($1, $2, $3, NOW())
        "#,
        user_id,
        token_hash,   // store hash of refresh token, never the raw token
        expires_at
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("store_refresh_token failed: {}", e)))?;

    Ok(())
}

pub async fn revoke_refresh_token(pool: &PgPool, jti: Uuid) -> AppResult<()> {
    sqlx::query!(
        r#"
        DELETE FROM refresh_tokens WHERE id = $1
        "#,
        jti
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("revoke_refresh_token failed: {}", e)))?;

    Ok(())
}

/// Revoke all refresh tokens for a user — used on password change or suspicious activity.
pub async fn revoke_all_refresh_tokens(pool: &PgPool, user_id: Uuid) -> AppResult<()> {
    sqlx::query!(
        r#"
        DELETE FROM refresh_tokens WHERE user_id = $1
        "#,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("revoke_all_refresh_tokens failed: {}", e)))?;

    tracing::info!(user_id = %user_id, "All refresh tokens revoked");

    Ok(())
}

/// Clean up expired refresh tokens — called by a background job.
pub async fn delete_expired_refresh_tokens(pool: &PgPool) -> AppResult<u64> {
    let result = sqlx::query!(
        r#"
        DELETE FROM refresh_tokens WHERE expires_at < NOW()
        "#
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("delete_expired_refresh_tokens failed: {}", e)))?;

    Ok(result.rows_affected())
}

// ── Sessions ──────────────────────────────────────────────────────────────────

pub async fn upsert_session(
    pool: &PgPool,
    user_id: Uuid,
    device_id: &str,
    ip_address: Option<IpNetwork>,
    user_agent: Option<&str>,
) -> AppResult<()> {
    sqlx::query!(
        r#"
        INSERT INTO user_sessions (user_id, device_id, ip_address, user_agent, last_seen_at, created_at)
        VALUES ($1, $2, $3::inet, $4, NOW(), NOW())
        ON CONFLICT (user_id, device_id)
        DO UPDATE SET
            ip_address   = EXCLUDED.ip_address,
            user_agent   = EXCLUDED.user_agent,
            last_seen_at = NOW()
        "#,
        user_id,
        device_id,
        ip_address,
        user_agent
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("upsert_session failed: {}", e)))?;

    Ok(())
}

pub async fn get_active_sessions(
    pool: &PgPool,
    user_id: Uuid,
) -> AppResult<Vec<UserSession>> {
    sqlx::query_as!(
        UserSession,
        r#"
        SELECT id, user_id, device_id, ip_address::text, user_agent, last_seen_at, created_at
        FROM user_sessions
        WHERE user_id = $1
        ORDER BY last_seen_at DESC
        "#,
        user_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("get_active_sessions failed: {}", e)))
}

pub async fn revoke_session(
    pool: &PgPool,
    user_id: Uuid,
    session_id: Uuid,
) -> AppResult<()> {
    sqlx::query!(
        r#"
        DELETE FROM user_sessions
        WHERE id = $1 AND user_id = $2
        "#,
        session_id,
        user_id
    )
    .execute(pool)
    .await
    .map_err(|e| AppError::Internal(anyhow::anyhow!("revoke_session failed: {}", e)))?;

    Ok(())
}

// ── Session struct ────────────────────────────────────────────────────────────

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
pub struct UserSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub device_id: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub last_seen_at: chrono::DateTime<Utc>,
    pub created_at: chrono::DateTime<Utc>,
}

