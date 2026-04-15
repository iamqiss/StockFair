//! Auth API calls mirroring motherlode auth endpoints.

use serde::Serialize;
use super::{client::{ApiClient, ApiResult}, types::*};

#[derive(Serialize)]
pub struct Step1Payload {
    pub first_name:    String,
    pub last_name:     String,
    pub date_of_birth: String,
    pub gender:        String,
}

#[derive(Serialize)]
pub struct Step2Payload {
    pub session_key:      String,
    pub phone:            String,
    pub email:            Option<String>,
    pub password:         String,
    pub confirm_password: String,
}

#[derive(Serialize)]
pub struct Step3Payload {
    pub phone:    String,
    pub language: String,
}

#[derive(Serialize)]
pub struct Step4Payload {
    pub phone:          String,
    pub interests:      Vec<String>,
    pub theme:          String,
    pub terms_accepted: bool,
}

#[derive(Serialize)]
pub struct SendOtpPayload {
    pub phone:   String,
    pub purpose: String,
}

#[derive(Serialize)]
pub struct VerifyOtpPayload {
    pub phone:   String,
    pub purpose: String,
    pub code:    String,
}

#[derive(Serialize)]
pub struct SignInPayload {
    pub identifier: String,
    pub password:   String,
}

#[derive(Serialize)]
pub struct ForgotPasswordPayload {
    pub phone: String,
}

#[derive(Serialize)]
pub struct ResetPasswordPayload {
    pub phone:                String,
    pub otp_token:            String,
    pub new_password:         String,
    pub confirm_new_password: String,
}

pub struct AuthApi<'a>(pub &'a ApiClient);

impl<'a> AuthApi<'a> {
    pub async fn register_step1(&self, p: Step1Payload) -> ApiResult<serde_json::Value> {
        self.0.post("/auth/register/step1", &p, None).await
    }
    pub async fn register_step2(&self, p: Step2Payload) -> ApiResult<serde_json::Value> {
        self.0.post("/auth/register/step2", &p, None).await
    }
    pub async fn register_step3(&self, p: Step3Payload) -> ApiResult<MessageResponse> {
        self.0.post("/auth/register/step3", &p, None).await
    }
    pub async fn register_step4(&self, p: Step4Payload) -> ApiResult<AuthResponse> {
        self.0.post("/auth/register/step4", &p, None).await
    }
    pub async fn send_otp(&self, p: SendOtpPayload) -> ApiResult<OtpSentResponse> {
        self.0.post("/auth/otp/send", &p, None).await
    }
    pub async fn verify_otp(&self, p: VerifyOtpPayload) -> ApiResult<OtpVerifiedResponse> {
        self.0.post("/auth/otp/verify", &p, None).await
    }
    pub async fn sign_in(&self, p: SignInPayload) -> ApiResult<AuthResponse> {
        self.0.post("/auth/signin", &p, None).await
    }
    pub async fn sign_out(&self, refresh_token: &str, access_token: &str) -> ApiResult<MessageResponse> {
        self.0.post("/auth/signout", &serde_json::json!({ "refresh_token": refresh_token }), Some(access_token)).await
    }
    pub async fn forgot_password(&self, p: ForgotPasswordPayload) -> ApiResult<OtpSentResponse> {
        self.0.post("/auth/forgot-password", &p, None).await
    }
    pub async fn reset_password(&self, p: ResetPasswordPayload) -> ApiResult<MessageResponse> {
        self.0.post("/auth/reset-password", &p, None).await
    }
    pub async fn me(&self, access_token: &str) -> ApiResult<serde_json::Value> {
        self.0.get("/auth/me", Some(access_token)).await
    }
    pub async fn refresh(&self, refresh_token: &str) -> ApiResult<serde_json::Value> {
        self.0.post("/auth/refresh", &serde_json::json!({ "refresh_token": refresh_token }), None).await
    }
}
