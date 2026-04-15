//! Shared API response types mirroring motherlode models.

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ApiError {
    pub error: String,
}

#[derive(Debug, Deserialize)]
pub struct MessageResponse {
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct UserProfile {
    pub id:              String,
    pub phone:           String,
    pub email:           Option<String>,
    pub full_name:       String,
    pub avatar_url:      Option<String>,
    pub language:        String,
    pub theme:           String,
    pub is_kyc_verified: bool,
    pub created_at:      String,
}

#[derive(Debug, Deserialize)]
pub struct AuthResponse {
    pub access_token:  String,
    pub refresh_token: String,
    pub user:          UserProfile,
}

#[derive(Debug, Deserialize)]
pub struct OtpSentResponse {
    pub message:          String,
    pub expires_in_seconds: u64,
    pub debug_otp:        Option<String>, // dev only
}

#[derive(Debug, Deserialize)]
pub struct OtpVerifiedResponse {
    pub otp_token: String,
    pub message:   String,
}
