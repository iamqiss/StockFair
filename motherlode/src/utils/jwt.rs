//! JWT generation and validation.
//! Access tokens (short-lived) + refresh tokens (long-lived, revocable via jti).

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::errors::{AppError, AppResult};

// ── Claims ────────────────────────────────────────────────────────────────────

/// Claims embedded in access tokens.
/// Short-lived (hours). Contains enough info to avoid a DB hit on every request.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccessClaims {
    /// user_id
    pub sub: Uuid,
    pub phone: String,
    pub is_kyc_verified: bool,
    /// issued at (unix timestamp)
    pub iat: i64,
    /// expiry (unix timestamp)
    pub exp: i64,
}

/// Claims embedded in refresh tokens.
/// Long-lived (days). jti allows individual token revocation via Redis blacklist.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RefreshClaims {
    /// user_id
    pub sub: Uuid,
    /// unique token id — stored in DB, used to detect reuse/revocation
    pub jti: Uuid,
    pub iat: i64,
    pub exp: i64,
}

// ── Token pair ────────────────────────────────────────────────────────────────

pub struct TokenPair {
    pub access_token: String,
    pub refresh_token: String,
    /// jti of the refresh token — caller must persist this to DB
    pub refresh_jti: Uuid,
}

// ── Generation ────────────────────────────────────────────────────────────────

pub fn generate_token_pair(
    user_id: Uuid,
    phone: &str,
    is_kyc_verified: bool,
    secret: &str,
    access_expiry_hours: i64,
    refresh_expiry_days: i64,
) -> AppResult<TokenPair> {
    let now = Utc::now();
    let refresh_jti = Uuid::new_v4();
    let encoding_key = EncodingKey::from_secret(secret.as_bytes());

    let access_claims = AccessClaims {
        sub: user_id,
        phone: phone.to_string(),
        is_kyc_verified,
        iat: now.timestamp(),
        exp: (now + Duration::hours(access_expiry_hours)).timestamp(),
    };

    let refresh_claims = RefreshClaims {
        sub: user_id,
        jti: refresh_jti,
        iat: now.timestamp(),
        exp: (now + Duration::days(refresh_expiry_days)).timestamp(),
    };

    let access_token = encode(&Header::default(), &access_claims, &encoding_key)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Access token encode failed: {}", e)))?;

    let refresh_token = encode(&Header::default(), &refresh_claims, &encoding_key)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Refresh token encode failed: {}", e)))?;

    Ok(TokenPair {
        access_token,
        refresh_token,
        refresh_jti,
    })
}

// ── Validation ────────────────────────────────────────────────────────────────

pub fn validate_access_token(token: &str, secret: &str) -> AppResult<AccessClaims> {
    decode::<AccessClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| {
        tracing::warn!("Access token validation failed: {}", e);
        AppError::Unauthorized
    })
}

pub fn validate_refresh_token(token: &str, secret: &str) -> AppResult<RefreshClaims> {
    decode::<RefreshClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| {
        tracing::warn!("Refresh token validation failed: {}", e);
        AppError::Unauthorized
    })
}

/// Extract claims from a token WITHOUT validating expiry.
/// Used only for refresh token rotation — to read the jti before deciding to reject.
pub fn decode_access_token_unverified(token: &str, secret: &str) -> AppResult<AccessClaims> {
    let mut validation = Validation::default();
    validation.validate_exp = false;
    decode::<AccessClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|data| data.claims)
    .map_err(|_| AppError::Unauthorized)
}

// ── Redis blacklist helpers ───────────────────────────────────────────────────

/// Blacklist a refresh token jti in Redis on sign-out or rotation.
pub async fn blacklist_refresh_jti(
    redis: &mut redis::aio::ConnectionManager,
    jti: Uuid,
    ttl_seconds: u64,
) -> AppResult<()> {
    redis::cmd("SETEX")
        .arg(format!("blacklist:refresh:{}", jti))
        .arg(ttl_seconds)
        .arg("1")
        .query_async::<_, ()>(redis)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis blacklist failed: {}", e)))?;
    Ok(())
}

/// Check if a refresh token jti has been blacklisted.
pub async fn is_refresh_jti_blacklisted(
    redis: &mut redis::aio::ConnectionManager,
    jti: Uuid,
) -> AppResult<bool> {
    let result: Option<String> = redis::cmd("GET")
        .arg(format!("blacklist:refresh:{}", jti))
        .query_async(redis)
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Redis blacklist check failed: {}", e)))?;
    Ok(result.is_some())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "test_secret_long_enough_for_hmac_256_algorithm";

    #[test]
    fn test_generate_and_validate_access_token() {
        let user_id = Uuid::new_v4();
        let pair = generate_token_pair(user_id, "+27821234567", false, SECRET, 24, 30).unwrap();
        let claims = validate_access_token(&pair.access_token, SECRET).unwrap();
        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.phone, "+27821234567");
        assert!(!claims.is_kyc_verified);
    }

    #[test]
    fn test_generate_and_validate_refresh_token() {
        let user_id = Uuid::new_v4();
        let pair = generate_token_pair(user_id, "+27821234567", true, SECRET, 24, 30).unwrap();
        let claims = validate_refresh_token(&pair.refresh_token, SECRET).unwrap();
        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.jti, pair.refresh_jti);
    }

    #[test]
    fn test_wrong_secret_rejected() {
        let user_id = Uuid::new_v4();
        let pair = generate_token_pair(user_id, "+27821234567", false, SECRET, 24, 30).unwrap();
        let result = validate_access_token(&pair.access_token, "wrong_secret");
        assert!(result.is_err());
    }

    #[test]
    fn test_kyc_flag_in_claims() {
        let user_id = Uuid::new_v4();
        let pair = generate_token_pair(user_id, "+27821234567", true, SECRET, 24, 30).unwrap();
        let claims = validate_access_token(&pair.access_token, SECRET).unwrap();
        assert!(claims.is_kyc_verified);
    }
}

