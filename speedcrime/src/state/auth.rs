//! Authentication state.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default)]
pub struct AuthState {
    pub user:          Option<UserProfile>,
    pub access_token:  Option<String>,
    pub refresh_token: Option<String>,
    pub is_loading:    bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id:              String,
    pub full_name:       String,
    pub phone:           String,
    pub email:           Option<String>,
    pub language:        String,
    pub theme:           String,
    pub is_kyc_verified: bool,
    pub avatar_url:      Option<String>,
}

impl UserProfile {
    pub fn first_name(&self) -> &str {
        self.full_name.split_whitespace().next().unwrap_or(&self.full_name)
    }
}

impl AuthState {
    pub fn is_authenticated(&self) -> bool {
        self.user.is_some() && self.access_token.is_some()
    }
}
