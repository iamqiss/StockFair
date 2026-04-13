//! Authenticated user extractor.
//!
//! Extracts and validates a JWT access token from the Authorization header,
//! returning the decoded claims as `AuthUser`.
//!
//! Usage in handlers:
//!
//! ```rust
//! pub async fn some_protected_handler(
//!     auth: AuthUser,
//!     State(state): State<AppState>,
//! ) -> AppResult<impl IntoResponse> {
//!     println!("Request from user: {}", auth.user_id);
//!     // ...
//! }
//! ```
//!
//! KYC-gated usage:
//!
//! ```rust
//! pub async fn kyc_required_handler(
//!     auth: KycVerifiedUser,
//!     State(state): State<AppState>,
//! ) -> AppResult<impl IntoResponse> {
//!     // Only reachable if user has completed KYC
//! }
//! ```

use axum::{
    async_trait,
    extract::State,
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    errors::AppError,
    utils::jwt::{validate_access_token, AccessClaims},
};

// ── AuthUser ──────────────────────────────────────────────────────────────────

/// Decoded claims from a valid JWT access token.
/// Available in any protected handler via extractor.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub phone: String,
    pub is_kyc_verified: bool,
}

impl AuthUser {
    pub fn from_claims(claims: AccessClaims) -> Self {
        Self {
            user_id: claims.sub,
            phone: claims.phone,
            is_kyc_verified: claims.is_kyc_verified,
        }
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AuthRejection;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // Extract JWT secret from app state
        // We extract it manually to avoid a circular dependency on AppState
        let secret = extract_jwt_secret(&parts.extensions)
            .ok_or(AuthRejection::MissingSecret)?;

        // Extract bearer token from Authorization header
        let token = extract_bearer_token(&parts.headers)
            .ok_or(AuthRejection::MissingToken)?;

        // Validate and decode
        let claims = validate_access_token(&token, &secret)
            .map_err(|_| AuthRejection::InvalidToken)?;

        Ok(AuthUser::from_claims(claims))
    }
}

// ── KycVerifiedUser ───────────────────────────────────────────────────────────

/// Extractor that additionally requires KYC verification.
/// Use on endpoints that require verified identity:
///   - Contributions over R5,000
///   - Group creation
///   - Investment stokvels
///   - Withdrawals to bank
#[derive(Debug, Clone)]
pub struct KycVerifiedUser(pub AuthUser);

impl KycVerifiedUser {
    pub fn user_id(&self) -> Uuid {
        self.0.user_id
    }

    pub fn phone(&self) -> &str {
        &self.0.phone
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for KycVerifiedUser
where
    S: Send + Sync,
{
    type Rejection = AuthRejection;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let auth_user = AuthUser::from_request_parts(parts, state).await?;

        if !auth_user.is_kyc_verified {
            return Err(AuthRejection::KycRequired);
        }

        Ok(KycVerifiedUser(auth_user))
    }
}

// ── OptionalAuth ──────────────────────────────────────────────────────────────

/// Extractor for endpoints that work for both authenticated and anonymous users.
/// Returns None if no valid token is present (no error).
/// Returns Some(AuthUser) if a valid token is present.
///
/// Example: Discover page — public stokvels visible to all, but personalised
/// recommendations only available when signed in.
#[derive(Debug, Clone)]
pub struct OptionalAuth(pub Option<AuthUser>);

#[async_trait]
impl<S> FromRequestParts<S> for OptionalAuth
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match AuthUser::from_request_parts(parts, state).await {
            Ok(user) => Ok(OptionalAuth(Some(user))),
            Err(_) => Ok(OptionalAuth(None)),
        }
    }
}

// ── Rejection ─────────────────────────────────────────────────────────────────

/// Auth rejection types — returned as HTTP responses when extraction fails.
#[derive(Debug)]
pub enum AuthRejection {
    MissingToken,
    InvalidToken,
    KycRequired,
    MissingSecret,
}

impl IntoResponse for AuthRejection {
    fn into_response(self) -> Response {
        let (status, code, message) = match self {
            AuthRejection::MissingToken => (
                StatusCode::UNAUTHORIZED,
                "missing_token",
                "Authorization header is required",
            ),
            AuthRejection::InvalidToken => (
                StatusCode::UNAUTHORIZED,
                "invalid_token",
                "Token is invalid or has expired",
            ),
            AuthRejection::KycRequired => (
                StatusCode::FORBIDDEN,
                "kyc_required",
                "Identity verification is required for this action. Please complete KYC.",
            ),
            AuthRejection::MissingSecret => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "server_error",
                "Internal configuration error",
            ),
        };

        (
            status,
            Json(json!({
                "error": message,
                "code": code
            })),
        )
            .into_response()
    }
}

// ── JWT secret injection ──────────────────────────────────────────────────────
// We inject the JWT secret into request extensions via middleware
// so the extractor can access it without depending on AppState directly.
// This keeps the extractor generic over S.

/// Extension type for carrying the JWT secret through request extensions.
#[derive(Clone)]
pub struct JwtSecret(pub String);

/// Extract JWT secret from request extensions.
fn extract_jwt_secret(extensions: &axum::http::Extensions) -> Option<String> {
    extensions.get::<JwtSecret>().map(|s| s.0.clone())
}

/// Inject JWT secret into request extensions.
/// Call this in a middleware layer that runs before protected routes.
pub fn inject_jwt_secret(
    mut req: axum::http::Request<axum::body::Body>,
    secret: String,
) -> axum::http::Request<axum::body::Body> {
    req.extensions_mut().insert(JwtSecret(secret));
    req
}

// ── Token extraction helper ───────────────────────────────────────────────────

/// Extract bearer token from Authorization header.
/// Accepts: "Bearer <token>" format only.
fn extract_bearer_token(headers: &HeaderMap) -> Option<String> {
    headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| {
            if v.starts_with("Bearer ") {
                Some(v[7..].trim().to_string())
            } else {
                None
            }
        })
        .filter(|t| !t.is_empty())
}

// ── Middleware for injecting JWT secret ───────────────────────────────────────

use axum::{middleware::Next, http::Request, body::Body};

/// Tower middleware layer that injects the JWT secret into every request's extensions.
/// Apply this to all protected route groups.
///
/// Usage in routes/mod.rs:
/// ```rust
/// use axum::middleware;
/// use crate::extractors::auth_user::inject_jwt_secret_middleware;
///
/// let protected = Router::new()
///     .merge(stokvels::router())
///     .layer(middleware::from_fn_with_state(
///         state.clone(),
///         inject_jwt_secret_middleware,
///     ));
/// ```
pub async fn inject_jwt_secret_middleware(
    State(state): axum::extract::State<crate::routes::AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Response {
    req.extensions_mut()
        .insert(JwtSecret(state.config.jwt_secret.clone()));
    next.run(req).await
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn test_extract_bearer_token_valid() {
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::AUTHORIZATION,
            HeaderValue::from_static("Bearer eyJhbGciOiJIUzI1NiJ9.test.token"),
        );
        let token = extract_bearer_token(&headers);
        assert_eq!(token, Some("eyJhbGciOiJIUzI1NiJ9.test.token".to_string()));
    }

    #[test]
    fn test_extract_bearer_token_missing() {
        let headers = HeaderMap::new();
        assert_eq!(extract_bearer_token(&headers), None);
    }

    #[test]
    fn test_extract_bearer_token_wrong_scheme() {
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::AUTHORIZATION,
            HeaderValue::from_static("Basic dXNlcjpwYXNz"),
        );
        assert_eq!(extract_bearer_token(&headers), None);
    }

    #[test]
    fn test_extract_bearer_token_empty_value() {
        let mut headers = HeaderMap::new();
        headers.insert(
            axum::http::header::AUTHORIZATION,
            HeaderValue::from_static("Bearer "),
        );
        assert_eq!(extract_bearer_token(&headers), None);
    }

    #[test]
    fn test_auth_rejection_status_codes() {
        // Verify rejection types map to correct HTTP status codes
        let missing = AuthRejection::MissingToken.into_response();
        assert_eq!(missing.status(), StatusCode::UNAUTHORIZED);

        let invalid = AuthRejection::InvalidToken.into_response();
        assert_eq!(invalid.status(), StatusCode::UNAUTHORIZED);

        let kyc = AuthRejection::KycRequired.into_response();
        assert_eq!(kyc.status(), StatusCode::FORBIDDEN);
    }
}
