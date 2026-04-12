//! User model — DB structs, DTOs, request/response types for all auth flows.
//!
//! Naming convention:
//!   - `User`         — full DB record (never serialized to client)
//!   - `UserProfile`  — safe public representation (no hashes)
//!   - `Register*`    — step-by-step onboarding request payloads
//!   - `*Request`     — inbound API request bodies
//!   - `*Response`    — outbound API response bodies

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

// ── DB Record ─────────────────────────────────────────────────────────────────

/// Full user record as stored in the database.
/// NEVER serialize this directly to a client response — use UserProfile.
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub phone: String,
    pub email: Option<String>,
    pub full_name: String,
    pub avatar_url: Option<String>,
    pub password_hash: Option<String>,
    pub pin_hash: Option<String>,
    pub language: String,
    pub theme: String,
    pub is_active: bool,
    pub is_phone_verified: bool,
    pub is_kyc_verified: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── Public Profile ────────────────────────────────────────────────────────────

/// Safe public representation of a user.
/// Hashes and sensitive fields are stripped.
#[derive(Debug, Clone, Serialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub phone: String,
    pub email: Option<String>,
    pub full_name: String,
    pub avatar_url: Option<String>,
    pub language: String,
    pub theme: String,
    pub is_kyc_verified: bool,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserProfile {
    fn from(u: User) -> Self {
        Self {
            id: u.id,
            phone: u.phone,
            email: u.email,
            full_name: u.full_name,
            avatar_url: u.avatar_url,
            language: u.language,
            theme: u.theme,
            is_kyc_verified: u.is_kyc_verified,
            created_at: u.created_at,
        }
    }
}

// ── Language ──────────────────────────────────────────────────────────────────

/// All 11 official South African languages.
/// Xitsonga (ts) has first-class support with culturally reviewed translations.
#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "varchar", rename_all = "snake_case")]
pub enum SupportedLanguage {
    En,   // English
    Zu,   // isiZulu
    Xh,   // isiXhosa
    Af,   // Afrikaans
    Nso,  // Sepedi
    Tn,   // Setswana
    St,   // Sesotho
    Ts,   // Xitsonga — first-class, culturally reviewed
    Ss,   // siSwati
    Ve,   // Tshivenda
    Nr,   // isiNdebele
}

impl SupportedLanguage {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::En  => "en",
            Self::Zu  => "zu",
            Self::Xh  => "xh",
            Self::Af  => "af",
            Self::Nso => "nso",
            Self::Tn  => "tn",
            Self::St  => "st",
            Self::Ts  => "ts",
            Self::Ss  => "ss",
            Self::Ve  => "ve",
            Self::Nr  => "nr",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::En  => "English",
            Self::Zu  => "isiZulu",
            Self::Xh  => "isiXhosa",
            Self::Af  => "Afrikaans",
            Self::Nso => "Sepedi",
            Self::Tn  => "Setswana",
            Self::St  => "Sesotho",
            Self::Ts  => "Xitsonga",
            Self::Ss  => "siSwati",
            Self::Ve  => "Tshivenda",
            Self::Nr  => "isiNdebele",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "en"  => Some(Self::En),
            "zu"  => Some(Self::Zu),
            "xh"  => Some(Self::Xh),
            "af"  => Some(Self::Af),
            "nso" => Some(Self::Nso),
            "tn"  => Some(Self::Tn),
            "st"  => Some(Self::St),
            "ts"  => Some(Self::Ts),
            "ss"  => Some(Self::Ss),
            "ve"  => Some(Self::Ve),
            "nr"  => Some(Self::Nr),
            _     => None,
        }
    }
}

impl Default for SupportedLanguage {
    fn default() -> Self {
        Self::En
    }
}

// ── Gender ────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, sqlx::Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "varchar", rename_all = "snake_case")]
pub enum Gender {
    Male,
    Female,
    NonBinary,
    PreferNotToSay,
}

impl Gender {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Male          => "male",
            Self::Female        => "female",
            Self::NonBinary     => "non_binary",
            Self::PreferNotToSay => "prefer_not_to_say",
        }
    }
}

// ── Stokvel Interest ──────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum StokvelInterest {
    Rotation,
    Burial,
    Investment,
    Grocery,
    Social,
}

impl StokvelInterest {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Rotation   => "rotation",
            Self::Burial     => "burial",
            Self::Investment => "investment",
            Self::Grocery    => "grocery",
            Self::Social     => "social",
        }
    }
}

// ── Theme ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AppTheme {
    Obsidian, // monochrome light & dark
    Forge,    // amber gold light & dark
    Bloom,    // fuchsia light & dark
}

impl AppTheme {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Obsidian => "obsidian",
            Self::Forge    => "forge",
            Self::Bloom    => "bloom",
        }
    }
}

impl Default for AppTheme {
    fn default() -> Self {
        Self::Obsidian
    }
}

// ── Registration Steps ────────────────────────────────────────────────────────

/// Step 1 — Personal details (FICA compliance)
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterStep1Request {
    #[validate(length(min = 2, max = 100, message = "First name must be 2–100 characters"))]
    pub first_name: String,

    #[validate(length(min = 2, max = 100, message = "Last name must be 2–100 characters"))]
    pub last_name: String,

    /// DD/MM/YYYY — validated further in service layer
    #[validate(length(min = 10, max = 10, message = "Date of birth must be DD/MM/YYYY"))]
    pub date_of_birth: String,

    pub gender: Gender,
}

/// Step 2 — Contact & security
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterStep2Request {
    /// SA mobile number in E.164 format: +27XXXXXXXXX
    #[validate(length(min = 12, max = 13, message = "Invalid SA mobile number"))]
    pub phone: String,

    #[validate(email(message = "Invalid email address"))]
    pub email: Option<String>,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,

    pub confirm_password: String,
}

/// Step 3 — Language preference
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterStep3Request {
    pub language: SupportedLanguage,
}

/// Step 4 — Stokvel interests + T&Cs acceptance
#[derive(Debug, Deserialize, Validate)]
pub struct RegisterStep4Request {
    #[validate(length(min = 1, message = "Select at least one stokvel interest"))]
    pub interests: Vec<StokvelInterest>,

    pub theme: Option<AppTheme>,

    pub terms_accepted: bool,
}

/// Final assembled payload passed to the repository after all steps complete.
/// Built by the service layer from the Redis-cached step data.
#[derive(Debug)]
pub struct CreateUserPayload {
    pub phone: String,
    pub email: Option<String>,
    pub full_name: String,       // "{first_name} {last_name}"
    pub date_of_birth: String,
    pub gender: String,
    pub password_hash: String,
    pub language: String,
    pub theme: String,
    pub interests: Vec<String>,  // serialized to JSONB
}

// ── Registration Step Cache ───────────────────────────────────────────────────
// Steps 1–3 are cached in Redis while the user completes the flow.
// On step 4 completion + OTP verification, everything is assembled and written to DB.

/// Cached registration data stored in Redis between steps.
/// Key: `reg_session:{phone}`
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegistrationSession {
    pub phone: String,
    pub first_name: String,
    pub last_name: String,
    pub date_of_birth: String,
    pub gender: String,
    pub email: Option<String>,
    pub password_hash: String,
    pub language: String,
    pub theme: String,
    pub interests: Vec<String>,
}

// ── OTP ───────────────────────────────────────────────────────────────────────

/// OTP purpose — what the OTP is authorising
#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum OtpPurpose {
    Register,
    ResetPassword,
    Withdraw,
}

impl OtpPurpose {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Register      => "register",
            Self::ResetPassword => "reset_password",
            Self::Withdraw      => "withdraw",
        }
    }
}

#[derive(Debug, Deserialize, Validate)]
pub struct SendOtpRequest {
    /// SA mobile number: +27XXXXXXXXX
    #[validate(length(min = 12, max = 13, message = "Invalid SA mobile number"))]
    pub phone: String,

    pub purpose: OtpPurpose,
}

#[derive(Debug, Deserialize, Validate)]
pub struct VerifyOtpRequest {
    #[validate(length(min = 12, max = 13, message = "Invalid SA mobile number"))]
    pub phone: String,

    pub purpose: OtpPurpose,

    #[validate(length(min = 6, max = 6, message = "OTP must be exactly 6 digits"))]
    pub code: String,
}

// ── Sign In ───────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Validate)]
pub struct SignInRequest {
    /// Phone or email — service layer resolves which
    pub identifier: String,

    #[validate(length(min = 8, message = "Invalid password"))]
    pub password: String,
}

// ── Password Reset ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Validate)]
pub struct ForgotPasswordRequest {
    #[validate(length(min = 12, max = 13, message = "Invalid SA mobile number"))]
    pub phone: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ResetPasswordRequest {
    #[validate(length(min = 12, max = 13, message = "Invalid SA mobile number"))]
    pub phone: String,

    /// Short-lived token issued after OTP verification
    pub otp_token: String,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub new_password: String,

    pub confirm_new_password: String,
}

// ── Token Refresh ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

// ── Profile Updates ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProfileRequest {
    #[validate(length(min = 2, max = 100))]
    pub full_name: Option<String>,

    #[validate(email)]
    pub email: Option<String>,

    pub language: Option<SupportedLanguage>,

    pub theme: Option<AppTheme>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdatePinRequest {
    /// Current PIN for verification (if PIN already set)
    pub current_pin: Option<String>,

    #[validate(length(min = 4, max = 4, message = "PIN must be exactly 4 digits"))]
    pub new_pin: String,

    #[validate(length(min = 4, max = 4, message = "PIN must be exactly 4 digits"))]
    pub confirm_pin: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct ChangePasswordRequest {
    pub current_password: String,

    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub new_password: String,

    pub confirm_new_password: String,
}

// ── Responses ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user: UserProfile,
}

#[derive(Debug, Serialize)]
pub struct OtpSentResponse {
    pub message: String,
    pub expires_in_seconds: u64,
    /// Only present in non-production for testing
    #[serde(skip_serializing_if = "Option::is_none")]
    pub debug_otp: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OtpVerifiedResponse {
    /// Short-lived token (10 min) that authorises the next step (registration or password reset)
    pub otp_token: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct TokenRefreshResponse {
    pub access_token: String,
    pub refresh_token: String,
}

// ── Validation helpers ────────────────────────────────────────────────────────

/// Validate SA phone number format: +27XXXXXXXXX (12 chars)
/// or 0XXXXXXXXX (10 chars) — normalised to E.164 in service layer
pub fn is_valid_sa_phone(phone: &str) -> bool {
    let cleaned = phone.replace([' ', '-'], "");
    if cleaned.starts_with("+27") && cleaned.len() == 12 {
        return cleaned[3..].chars().all(|c| c.is_ascii_digit());
    }
    if cleaned.starts_with('0') && cleaned.len() == 10 {
        return cleaned[1..].chars().all(|c| c.is_ascii_digit());
    }
    false
}

/// Normalise SA phone to E.164: 0821234567 → +27821234567
pub fn normalise_sa_phone(phone: &str) -> String {
    let cleaned = phone.replace([' ', '-'], "");
    if cleaned.starts_with('0') {
        format!("+27{}", &cleaned[1..])
    } else {
        cleaned
    }
}

/// Validate SA ID number check digit (Luhn-based)
pub fn is_valid_sa_id(id: &str) -> bool {
    if id.len() != 13 || !id.chars().all(|c| c.is_ascii_digit()) {
        return false;
    }
    let digits: Vec<u32> = id.chars()
        .map(|c| c.to_digit(10).unwrap())
        .collect();

    let mut odd_sum: u32 = 0;
    let mut even_concat = String::new();

    for (i, &d) in digits[..12].iter().enumerate() {
        if i % 2 == 0 {
            odd_sum += d;
        } else {
            even_concat.push_str(&d.to_string());
        }
    }

    let even_num: u32 = even_concat.parse::<u32>().unwrap_or(0) * 2;
    let even_sum: u32 = even_num.to_string()
        .chars()
        .map(|c| c.to_digit(10).unwrap())
        .sum();

    let total = odd_sum + even_sum;
    let check = (10 - (total % 10)) % 10;
    check == digits[12]
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalise_phone() {
        assert_eq!(normalise_sa_phone("0821234567"), "+27821234567");
        assert_eq!(normalise_sa_phone("+27821234567"), "+27821234567");
        assert_eq!(normalise_sa_phone("082 123 4567"), "+27821234567");
    }

    #[test]
    fn test_valid_sa_phone() {
        assert!(is_valid_sa_phone("0821234567"));
        assert!(is_valid_sa_phone("+27821234567"));
        assert!(!is_valid_sa_phone("1234567890"));
        assert!(!is_valid_sa_phone("+1234567890"));
    }

    #[test]
    fn test_user_profile_strips_hashes() {
        let user = User {
            id: Uuid::new_v4(),
            phone: "+27821234567".to_string(),
            email: None,
            full_name: "Thandi Dlamini".to_string(),
            avatar_url: None,
            password_hash: Some("$argon2id$...".to_string()),
            pin_hash: Some("$argon2id$...".to_string()),
            language: "ts".to_string(),
            theme: "forge".to_string(),
            is_active: true,
            is_phone_verified: true,
            is_kyc_verified: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let profile = UserProfile::from(user);
        // Verify hashes are not present in profile
        let json = serde_json::to_string(&profile).unwrap();
        assert!(!json.contains("password_hash"));
        assert!(!json.contains("pin_hash"));
        assert!(!json.contains("argon2"));
    }

    #[test]
    fn test_language_round_trip() {
        let lang = SupportedLanguage::Ts;
        assert_eq!(lang.as_str(), "ts");
        assert_eq!(lang.display_name(), "Xitsonga");
        assert_eq!(SupportedLanguage::from_str("ts"), Some(SupportedLanguage::Ts));
    }

    #[test]
    fn test_all_11_languages_covered() {
        let codes = ["en", "zu", "xh", "af", "nso", "tn", "st", "ts", "ss", "ve", "nr"];
        for code in codes {
            assert!(SupportedLanguage::from_str(code).is_some(), "Missing language: {}", code);
        }
    }
}

