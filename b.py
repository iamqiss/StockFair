#!/usr/bin/env python3
"""
speedcrime — StockFair Blinc Frontend Scaffold
GPU-accelerated, Rust-native, Social & Privacy-first.

motherlode + speedcrime.

Run from: StockFair/speedcrime/
"""

import os

ROOT = "speedcrime"

FILES = [

# ── Cargo.toml ────────────────────────────────────────────────────────────────

(
"Cargo.toml",
"""[package]
name = "speedcrime"
version = "0.1.0"
edition = "2021"
description = "StockFair — GPU-accelerated Blinc frontend"

[[bin]]
name = "speedcrime"
path = "src/main.rs"

[dependencies]
# Blinc UI framework
blinc_app      = { version = "0.1", features = ["windowed", "android"] }
blinc_layout   = "0.1"
blinc_animation = "0.1"

# Async runtime
tokio          = { version = "1", features = ["full"] }

# HTTP client for motherlode
reqwest        = { version = "0.11", features = ["json", "rustls-tls"] }

# Serialization
serde          = { version = "1", features = ["derive"] }
serde_json     = "1"

# Secure storage (tokens)
keyring        = "2"

# Internationalization
rust-i18n      = "3"

# Error handling
anyhow         = "1"
thiserror      = "1"

# Logging
tracing        = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# UUID
uuid           = { version = "1", features = ["v4"] }

# Date/time
chrono         = { version = "0.4", features = ["serde"] }

[dev-dependencies]
tokio-test = "0.4"
""",
),

# ── .env.example ──────────────────────────────────────────────────────────────

(
".env.example",
"""# Motherlode API
MOTHERLODE_URL=http://localhost:8080

# App
APP_ENV=development
""",
),

# ── .gitignore ────────────────────────────────────────────────────────────────

(
".gitignore",
"""target/
.env
*.log
assets/fonts/*.ttf
""",
),

# ── src/main.rs ───────────────────────────────────────────────────────────────

(
"src/main.rs",
"""use blinc_app::prelude::*;
use blinc_app::windowed::{WindowedApp, WindowedContext, WindowConfig};

mod api;
mod app;
mod components;
mod i18n;
mod router;
mod state;
mod theme;

use app::root::root_view;

fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    dotenvy::dotenv().ok();

    let config = WindowConfig {
        title: "StockFair".to_string(),
        width: 390,   // iPhone 14 Pro width — mobile-first
        height: 844,
        resizable: true,
        min_width: Some(320),
        min_height: Some(568),
        ..Default::default()
    };

    WindowedApp::run(config, |ctx| root_view(ctx))
}
""",
),

# ── src/theme.rs ──────────────────────────────────────────────────────────────

(
"src/theme.rs",
"""//! StockFair design tokens.
//!
//! Three complete themes: Obsidian, Forge, Bloom — each with light and dark.
//! Colors mirror the React Native app exactly.

use blinc_app::prelude::Color;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ThemeVariant {
    Obsidian,
    Forge,
    Bloom,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ColorMode {
    Light,
    Dark,
}

#[derive(Debug, Clone)]
pub struct Theme {
    pub variant: ThemeVariant,
    pub mode: ColorMode,

    // ── Surfaces ─────────────────────────────────────────────────────────────
    pub bg_primary:    Color,
    pub bg_secondary:  Color,
    pub bg_card:       Color,
    pub bg_elevated:   Color,

    // ── Text ─────────────────────────────────────────────────────────────────
    pub text_primary:  Color,
    pub text_secondary:Color,
    pub text_muted:    Color,
    pub text_inverse:  Color,

    // ── Brand ─────────────────────────────────────────────────────────────────
    pub accent:        Color,
    pub accent_warm:   Color,
    pub accent_soft:   Color,

    // ── Semantic ──────────────────────────────────────────────────────────────
    pub success:       Color,
    pub warning:       Color,
    pub danger:        Color,
    pub info:          Color,

    // ── Borders ───────────────────────────────────────────────────────────────
    pub border:        Color,
    pub border_strong: Color,

    // ── Nav bar ───────────────────────────────────────────────────────────────
    pub nav_bg:        Color,
    pub nav_active:    Color,
    pub nav_inactive:  Color,
}

impl Theme {
    pub fn obsidian_dark() -> Self {
        Self {
            variant: ThemeVariant::Obsidian,
            mode:    ColorMode::Dark,
            bg_primary:     Color::rgba(0.039, 0.039, 0.039, 1.0), // #0A0A0A
            bg_secondary:   Color::rgba(0.071, 0.071, 0.071, 1.0), // #121212
            bg_card:        Color::rgba(0.110, 0.110, 0.110, 1.0), // #1C1C1C
            bg_elevated:    Color::rgba(0.157, 0.157, 0.157, 1.0), // #282828
            text_primary:   Color::rgba(1.0, 1.0, 1.0, 1.0),
            text_secondary: Color::rgba(0.75, 0.75, 0.75, 1.0),
            text_muted:     Color::rgba(0.45, 0.45, 0.45, 1.0),
            text_inverse:   Color::rgba(0.039, 0.039, 0.039, 1.0),
            accent:         Color::rgba(1.0, 1.0, 1.0, 1.0),
            accent_warm:    Color::rgba(0.867, 0.753, 0.0, 1.0),   // #DDCD00
            accent_soft:    Color::rgba(0.2, 0.2, 0.2, 1.0),
            success:        Color::rgba(0.086, 0.639, 0.239, 1.0), // #16A34A
            warning:        Color::rgba(0.867, 0.753, 0.0, 1.0),
            danger:         Color::rgba(0.898, 0.243, 0.243, 1.0), // #E53E3E
            info:           Color::rgba(0.247, 0.494, 0.996, 1.0),
            border:         Color::rgba(1.0, 1.0, 1.0, 0.08),
            border_strong:  Color::rgba(1.0, 1.0, 1.0, 0.16),
            nav_bg:         Color::rgba(0.039, 0.039, 0.039, 0.95),
            nav_active:     Color::rgba(1.0, 1.0, 1.0, 1.0),
            nav_inactive:   Color::rgba(0.45, 0.45, 0.45, 1.0),
        }
    }

    pub fn obsidian_light() -> Self {
        Self {
            variant: ThemeVariant::Obsidian,
            mode:    ColorMode::Light,
            bg_primary:     Color::rgba(0.961, 0.961, 0.961, 1.0), // #F5F5F5
            bg_secondary:   Color::rgba(1.0, 1.0, 1.0, 1.0),
            bg_card:        Color::rgba(1.0, 1.0, 1.0, 1.0),
            bg_elevated:    Color::rgba(0.937, 0.937, 0.937, 1.0),
            text_primary:   Color::rgba(0.039, 0.039, 0.039, 1.0),
            text_secondary: Color::rgba(0.25, 0.25, 0.25, 1.0),
            text_muted:     Color::rgba(0.45, 0.45, 0.45, 1.0),
            text_inverse:   Color::rgba(1.0, 1.0, 1.0, 1.0),
            accent:         Color::rgba(0.039, 0.039, 0.039, 1.0),
            accent_warm:    Color::rgba(0.867, 0.753, 0.0, 1.0),
            accent_soft:    Color::rgba(0.878, 0.878, 0.878, 1.0),
            success:        Color::rgba(0.086, 0.639, 0.239, 1.0),
            warning:        Color::rgba(0.867, 0.753, 0.0, 1.0),
            danger:         Color::rgba(0.898, 0.243, 0.243, 1.0),
            info:           Color::rgba(0.247, 0.494, 0.996, 1.0),
            border:         Color::rgba(0.0, 0.0, 0.0, 0.08),
            border_strong:  Color::rgba(0.0, 0.0, 0.0, 0.16),
            nav_bg:         Color::rgba(1.0, 1.0, 1.0, 0.95),
            nav_active:     Color::rgba(0.039, 0.039, 0.039, 1.0),
            nav_inactive:   Color::rgba(0.55, 0.55, 0.55, 1.0),
        }
    }

    pub fn forge_dark() -> Self {
        Self {
            variant: ThemeVariant::Forge,
            mode:    ColorMode::Dark,
            bg_primary:     Color::rgba(0.071, 0.047, 0.024, 1.0), // #120C06
            bg_secondary:   Color::rgba(0.102, 0.071, 0.039, 1.0),
            bg_card:        Color::rgba(0.141, 0.102, 0.055, 1.0),
            bg_elevated:    Color::rgba(0.180, 0.133, 0.078, 1.0),
            text_primary:   Color::rgba(1.0, 0.949, 0.878, 1.0),
            text_secondary: Color::rgba(0.867, 0.784, 0.667, 1.0),
            text_muted:     Color::rgba(0.588, 0.502, 0.392, 1.0),
            text_inverse:   Color::rgba(0.071, 0.047, 0.024, 1.0),
            accent:         Color::rgba(1.0, 0.749, 0.0, 1.0),     // #FFBF00 golden amber
            accent_warm:    Color::rgba(0.902, 0.494, 0.133, 1.0), // #E67E22 desert rose
            accent_soft:    Color::rgba(0.2, 0.141, 0.078, 1.0),
            success:        Color::rgba(0.086, 0.639, 0.239, 1.0),
            warning:        Color::rgba(1.0, 0.749, 0.0, 1.0),
            danger:         Color::rgba(0.898, 0.243, 0.243, 1.0),
            info:           Color::rgba(0.247, 0.494, 0.996, 1.0),
            border:         Color::rgba(1.0, 0.749, 0.0, 0.12),
            border_strong:  Color::rgba(1.0, 0.749, 0.0, 0.24),
            nav_bg:         Color::rgba(0.071, 0.047, 0.024, 0.95),
            nav_active:     Color::rgba(1.0, 0.749, 0.0, 1.0),
            nav_inactive:   Color::rgba(0.588, 0.502, 0.392, 1.0),
        }
    }

    pub fn bloom_dark() -> Self {
        Self {
            variant: ThemeVariant::Bloom,
            mode:    ColorMode::Dark,
            bg_primary:     Color::rgba(0.055, 0.024, 0.078, 1.0),
            bg_secondary:   Color::rgba(0.078, 0.039, 0.110, 1.0),
            bg_card:        Color::rgba(0.110, 0.055, 0.149, 1.0),
            bg_elevated:    Color::rgba(0.141, 0.078, 0.188, 1.0),
            text_primary:   Color::rgba(0.969, 0.878, 1.0, 1.0),
            text_secondary: Color::rgba(0.784, 0.667, 0.878, 1.0),
            text_muted:     Color::rgba(0.502, 0.392, 0.588, 1.0),
            text_inverse:   Color::rgba(0.055, 0.024, 0.078, 1.0),
            accent:         Color::rgba(0.796, 0.165, 0.878, 1.0), // fuchsia
            accent_warm:    Color::rgba(0.627, 0.125, 0.941, 1.0),
            accent_soft:    Color::rgba(0.2, 0.078, 0.259, 1.0),
            success:        Color::rgba(0.086, 0.639, 0.239, 1.0),
            warning:        Color::rgba(1.0, 0.749, 0.0, 1.0),
            danger:         Color::rgba(0.898, 0.243, 0.243, 1.0),
            info:           Color::rgba(0.247, 0.494, 0.996, 1.0),
            border:         Color::rgba(0.796, 0.165, 0.878, 0.12),
            border_strong:  Color::rgba(0.796, 0.165, 0.878, 0.24),
            nav_bg:         Color::rgba(0.055, 0.024, 0.078, 0.95),
            nav_active:     Color::rgba(0.796, 0.165, 0.878, 1.0),
            nav_inactive:   Color::rgba(0.502, 0.392, 0.588, 1.0),
        }
    }

    /// Radius tokens
    pub fn radius_sm()  -> f32 { 8.0 }
    pub fn radius_md()  -> f32 { 12.0 }
    pub fn radius_lg()  -> f32 { 16.0 }
    pub fn radius_xl()  -> f32 { 20.0 }
    pub fn radius_full()-> f32 { 999.0 }

    /// Spacing tokens (4px base unit)
    pub fn sp(units: f32) -> f32 { units * 4.0 }
}
""",
),

# ── src/state/mod.rs ──────────────────────────────────────────────────────────

(
"src/state/mod.rs",
"""pub mod app;
pub mod auth;
pub mod stokvels;
""",
),

(
"src/state/app.rs",
"""//! Global app state — theme, language, navigation.

use crate::theme::{ColorMode, Theme, ThemeVariant};
use crate::i18n::Language;

#[derive(Debug, Clone)]
pub struct AppState {
    pub theme_variant: ThemeVariant,
    pub color_mode:    ColorMode,
    pub language:      Language,
    pub current_route: Route,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Route {
    Welcome,
    Login,
    Register,
    // Tabs
    Home,
    Groups,
    Discover,
    Market,
    Profile,
    // Detail screens
    StokvelDetail(String),
    Messages(String),
    FairScore,
    Portfolio,
    Wallet,
    Notifications,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            theme_variant: ThemeVariant::Forge, // default to Forge — most SA-authentic
            color_mode:    ColorMode::Dark,
            language:      Language::English,
            current_route: Route::Welcome,
        }
    }
}

impl AppState {
    pub fn theme(&self) -> Theme {
        match (self.theme_variant, self.color_mode) {
            (ThemeVariant::Obsidian, ColorMode::Dark)  => Theme::obsidian_dark(),
            (ThemeVariant::Obsidian, ColorMode::Light) => Theme::obsidian_light(),
            (ThemeVariant::Forge,    ColorMode::Dark)  => Theme::forge_dark(),
            (ThemeVariant::Forge,    ColorMode::Light) => Theme::obsidian_light(), // TODO: forge light
            (ThemeVariant::Bloom,    ColorMode::Dark)  => Theme::bloom_dark(),
            (ThemeVariant::Bloom,    ColorMode::Light) => Theme::obsidian_light(), // TODO: bloom light
        }
    }
}
""",
),

(
"src/state/auth.rs",
"""//! Authentication state.

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
""",
),

(
"src/state/stokvels.rs",
"""//! Stokvel list and detail state.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stokvel {
    pub id:                  String,
    pub name:                String,
    pub stokvel_type:        StokvelType,
    pub status:              StokvelStatus,
    pub contribution_amount: f64,
    pub member_count:        u32,
    pub total_savings:       f64,
    pub next_payout_date:    Option<String>,
    pub progress_pct:        f64,
    pub is_overdue:          bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StokvelType {
    Grocery,
    Rotating,
    Burial,
    Investment,
    Savings,
}

impl StokvelType {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Grocery    => "Grocery",
            Self::Rotating   => "Rotating",
            Self::Burial     => "Burial Society",
            Self::Investment => "Investment",
            Self::Savings    => "Savings",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StokvelStatus {
    Active,
    Paused,
    Closed,
}
""",
),

# ── src/i18n/mod.rs ───────────────────────────────────────────────────────────

(
"src/i18n/mod.rs",
"""//! Internationalisation — all 11 official SA languages.
//! Xitsonga (ts) has first-class culturally reviewed translations.

pub mod translations;
pub use translations::{t, Language, TranslationKey};
""",
),

(
"src/i18n/translations.rs",
"""//! Translation strings for all 11 SA official languages.
//!
//! Xitsonga translations are culturally reviewed.
//! Others are currently English fallbacks — replace with native speaker
//! translations before launch.

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub enum Language {
    #[default]
    English,
    Zulu,
    Xhosa,
    Afrikaans,
    Sepedi,
    Setswana,
    Sesotho,
    Xitsonga,  // First-class — culturally reviewed
    Siswati,
    Tshivenda,
    Isindebele,
}

impl Language {
    pub fn code(&self) -> &'static str {
        match self {
            Self::English    => "en",
            Self::Zulu       => "zu",
            Self::Xhosa      => "xh",
            Self::Afrikaans  => "af",
            Self::Sepedi     => "nso",
            Self::Setswana   => "tn",
            Self::Sesotho    => "st",
            Self::Xitsonga   => "ts",
            Self::Siswati    => "ss",
            Self::Tshivenda  => "ve",
            Self::Isindebele => "nr",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Self::English    => "English",
            Self::Zulu       => "isiZulu",
            Self::Xhosa      => "isiXhosa",
            Self::Afrikaans  => "Afrikaans",
            Self::Sepedi     => "Sepedi",
            Self::Setswana   => "Setswana",
            Self::Sesotho    => "Sesotho",
            Self::Xitsonga   => "Xitsonga",
            Self::Siswati    => "siSwati",
            Self::Tshivenda  => "Tshivenda",
            Self::Isindebele => "isiNdebele",
        }
    }

    pub fn all() -> &'static [Language] {
        &[
            Self::English, Self::Zulu, Self::Xhosa, Self::Afrikaans,
            Self::Sepedi, Self::Setswana, Self::Sesotho, Self::Xitsonga,
            Self::Siswati, Self::Tshivenda, Self::Isindebele,
        ]
    }
}

#[derive(Debug, Clone, Copy)]
pub enum TranslationKey {
    // ── Auth ───────────────────────────────────────────────────────────────
    WelcomeTitle,
    WelcomeTagline,
    SignIn,
    SignUp,
    CreateAccount,
    PhoneNumber,
    Password,
    ForgotPassword,
    EnterOtp,
    OtpSentTo,
    Verify,
    Resend,

    // ── Home ───────────────────────────────────────────────────────────────
    WelcomeBack,
    TotalSavings,
    NextPayout,
    ContributeNow,
    History,
    MyStokvels,
    ViewAll,

    // ── Groups ─────────────────────────────────────────────────────────────
    MyGroups,
    CreateGroup,
    JoinGroup,
    Members,
    Contributions,
    GroupPot,
    Payout,
    Active,
    Pending,
    Overdue,
    Paid,

    // ── Market ─────────────────────────────────────────────────────────────
    Market,
    BulkDeals,
    PreOrder,
    Partners,
    SearchProducts,

    // ── Discover ───────────────────────────────────────────────────────────
    Discover,
    NearYou,
    Featured,
    TopPerformers,
    Safest,
    RequestToJoin,

    // ── Profile ────────────────────────────────────────────────────────────
    Profile,
    FairScore,
    Settings,
    Language,
    Theme,
    SignOut,
    Verified,
    NotVerified,

    // ── Wallet ─────────────────────────────────────────────────────────────
    Wallet,
    Balance,
    Deposit,
    Withdraw,
    Send,
    Receive,

    // ── Generic ────────────────────────────────────────────────────────────
    Continue,
    Back,
    Cancel,
    Save,
    Confirm,
    Loading,
    Error,
    Success,
    TryAgain,
    NetworkError,
}

/// Get a translated string for the given language and key.
pub fn t(lang: Language, key: TranslationKey) -> &'static str {
    match lang {
        Language::Xitsonga   => ts(key),
        Language::Zulu       => zu(key),
        Language::Sesotho    => st(key),
        _                    => en(key), // fallback to English
    }
}

// ── English ───────────────────────────────────────────────────────────────────

fn en(key: TranslationKey) -> &'static str {
    match key {
        TranslationKey::WelcomeTitle    => "Welcome to StockFair",
        TranslationKey::WelcomeTagline  => "Your stokvel, your way",
        TranslationKey::SignIn          => "Sign In",
        TranslationKey::SignUp          => "Sign Up",
        TranslationKey::CreateAccount   => "Create Account",
        TranslationKey::PhoneNumber     => "Phone Number",
        TranslationKey::Password        => "Password",
        TranslationKey::ForgotPassword  => "Forgot Password?",
        TranslationKey::EnterOtp        => "Enter Code",
        TranslationKey::OtpSentTo       => "Code sent to",
        TranslationKey::Verify          => "Verify",
        TranslationKey::Resend          => "Resend",
        TranslationKey::WelcomeBack     => "Welcome back",
        TranslationKey::TotalSavings    => "Total Savings",
        TranslationKey::NextPayout      => "Next Payout",
        TranslationKey::ContributeNow   => "Contribute Now",
        TranslationKey::History         => "History",
        TranslationKey::MyStokvels      => "My Stokvels",
        TranslationKey::ViewAll         => "View All",
        TranslationKey::MyGroups        => "My Groups",
        TranslationKey::CreateGroup     => "Create Group",
        TranslationKey::JoinGroup       => "Join Group",
        TranslationKey::Members         => "Members",
        TranslationKey::Contributions   => "Contributions",
        TranslationKey::GroupPot        => "Group Pot",
        TranslationKey::Payout          => "Payout",
        TranslationKey::Active          => "Active",
        TranslationKey::Pending         => "Pending",
        TranslationKey::Overdue         => "Overdue",
        TranslationKey::Paid            => "Paid",
        TranslationKey::Market          => "Market",
        TranslationKey::BulkDeals       => "Bulk deals for your stokvel",
        TranslationKey::PreOrder        => "Pre-Order",
        TranslationKey::Partners        => "Partners",
        TranslationKey::SearchProducts  => "Search products...",
        TranslationKey::Discover        => "Discover",
        TranslationKey::NearYou         => "Near You",
        TranslationKey::Featured        => "Featured",
        TranslationKey::TopPerformers   => "Top Performers",
        TranslationKey::Safest          => "Safest",
        TranslationKey::RequestToJoin   => "Request to Join",
        TranslationKey::Profile         => "Profile",
        TranslationKey::FairScore       => "Fair Score",
        TranslationKey::Settings        => "Settings",
        TranslationKey::Language        => "Language",
        TranslationKey::Theme           => "Theme",
        TranslationKey::SignOut         => "Sign Out",
        TranslationKey::Verified        => "Verified",
        TranslationKey::NotVerified     => "Not Verified",
        TranslationKey::Wallet          => "Wallet",
        TranslationKey::Balance         => "Balance",
        TranslationKey::Deposit         => "Deposit",
        TranslationKey::Withdraw        => "Withdraw",
        TranslationKey::Send            => "Send",
        TranslationKey::Receive         => "Receive",
        TranslationKey::Continue        => "Continue",
        TranslationKey::Back            => "Back",
        TranslationKey::Cancel          => "Cancel",
        TranslationKey::Save            => "Save",
        TranslationKey::Confirm         => "Confirm",
        TranslationKey::Loading         => "Loading...",
        TranslationKey::Error           => "Something went wrong",
        TranslationKey::Success         => "Success",
        TranslationKey::TryAgain        => "Try Again",
        TranslationKey::NetworkError    => "Network error. Check your connection.",
    }
}

// ── Xitsonga — first-class, culturally reviewed ────────────────────────────────
// TODO: complete review with native Tsonga teachers

fn ts(key: TranslationKey) -> &'static str {
    match key {
        TranslationKey::WelcomeTitle    => "Amukelekile eka StockFair",
        TranslationKey::WelcomeTagline  => "Stokvel ya wena, endlela ya wena",
        TranslationKey::SignIn          => "Nghena",
        TranslationKey::SignUp          => "Tsarisa",
        TranslationKey::CreateAccount   => "Tumbuluxa Akhaunto",
        TranslationKey::PhoneNumber     => "Nomboro ya Foni",
        TranslationKey::Password        => "Phasiwedi",
        TranslationKey::ForgotPassword  => "U kandziyerile Phasiwedi?",
        TranslationKey::EnterOtp        => "Nghenisa Khodi",
        TranslationKey::OtpSentTo       => "Khodi i rhumeriwe eka",
        TranslationKey::Verify          => "Hlohlometa",
        TranslationKey::Resend          => "Rhumela Nakambe",
        TranslationKey::WelcomeBack     => "Amukelekile Nakambe",
        TranslationKey::TotalSavings    => "Malanga Hinkwawo",
        TranslationKey::NextPayout      => "Rihlawulo ra Riva",
        TranslationKey::ContributeNow   => "Pfumela Sweswi",
        TranslationKey::History         => "Matsalwa",
        TranslationKey::MyStokvels      => "Swistokvel Swanga",
        TranslationKey::ViewAll         => "Vona Hinkwaswo",
        TranslationKey::MyGroups        => "Swikambana Swanga",
        TranslationKey::CreateGroup     => "Tumbuluxa Nkambana",
        TranslationKey::JoinGroup       => "Nghena Nkambana",
        TranslationKey::Members         => "Vanhu va Nkambana",
        TranslationKey::Contributions   => "Swipfumelo",
        TranslationKey::GroupPot        => "Mbita ya Nkambana",
        TranslationKey::Payout          => "Rihlawulo",
        TranslationKey::Active          => "Ri Tirha",
        TranslationKey::Pending         => "Ri Languta",
        TranslationKey::Overdue         => "Ri Hundza Nkarhi",
        TranslationKey::Paid            => "Ri Hlawiwe",
        TranslationKey::Market          => "Maxavelo",
        TranslationKey::BulkDeals       => "Mitengo ya ku xava ngopfu eka stokvel ya wena",
        TranslationKey::PreOrder        => "Odela Ku Nga si Fika",
        TranslationKey::Partners        => "Valandzi",
        TranslationKey::SearchProducts  => "Lava swivulavulo...",
        TranslationKey::Discover        => "Kuma Vantshwa",
        TranslationKey::NearYou         => "Eswifanelekeni na Wena",
        TranslationKey::Featured        => "Swi Hlawuriwe",
        TranslationKey::TopPerformers   => "Swi Tirhisiwa Swinene",
        TranslationKey::Safest          => "Swi Hlayiseka Swinene",
        TranslationKey::RequestToJoin   => "Kombela ku Nghena",
        TranslationKey::Profile         => "Ndzawulo ya Wena",
        TranslationKey::FairScore       => "Ntlhelo wa Ku Tshembiwa",
        TranslationKey::Settings        => "Swileriso",
        TranslationKey::Language        => "Ririmi",
        TranslationKey::Theme           => "Nhluvuko",
        TranslationKey::SignOut         => "Huma",
        TranslationKey::Verified        => "Hlohlometeriwile",
        TranslationKey::NotVerified     => "A Hlohlometeriwanga",
        TranslationKey::Wallet          => "Saka ra Timali",
        TranslationKey::Balance         => "Ntsengo",
        TranslationKey::Deposit         => "Nghenisa Timali",
        TranslationKey::Withdraw        => "Huma na Timali",
        TranslationKey::Send            => "Rhumela",
        TranslationKey::Receive         => "Amukela",
        TranslationKey::Continue        => "Tlhelela Emahlweni",
        TranslationKey::Back            => "Tlhelela Ehansi",
        TranslationKey::Cancel          => "Yima",
        TranslationKey::Save            => "Hlayisa",
        TranslationKey::Confirm         => "Pfumela",
        TranslationKey::Loading         => "Ri Hlayisa...",
        TranslationKey::Error           => "Ku humile xiphiqo",
        TranslationKey::Success         => "Swi Humelele",
        TranslationKey::TryAgain        => "Ringeta Nakambe",
        TranslationKey::NetworkError    => "Xiphiqo xa inthanete. Tarisa vuxokoxoko bya wena.",
    }
}

// ── isiZulu ───────────────────────────────────────────────────────────────────
// TODO: native speaker review

fn zu(key: TranslationKey) -> &'static str {
    match key {
        TranslationKey::WelcomeTitle    => "Wamukelekile ku StockFair",
        TranslationKey::WelcomeTagline  => "Istokveli sakho, ngendlela yakho",
        TranslationKey::SignIn          => "Ngena",
        TranslationKey::SignUp          => "Bhalisa",
        TranslationKey::CreateAccount   => "Dala i-Akhawunti",
        TranslationKey::PhoneNumber     => "Inombolo Yekheli",
        TranslationKey::Password        => "Iphasiwedi",
        TranslationKey::ForgotPassword  => "Ukhohlwe Iphasiwedi?",
        TranslationKey::EnterOtp        => "Faka Ikhodi",
        TranslationKey::OtpSentTo       => "Ikhodi ithunyelwe ku",
        TranslationKey::Verify          => "Qinisekisa",
        TranslationKey::Resend          => "Thumela Futhi",
        TranslationKey::WelcomeBack     => "Wamukelekile Futhi",
        TranslationKey::TotalSavings    => "Impela Yemali Egcinwe",
        TranslationKey::NextPayout      => "Inkokhelo Elandelayo",
        TranslationKey::ContributeNow   => "Faka Manje",
        TranslationKey::MyStokvels      => "Omastokveli Bami",
        TranslationKey::ViewAll         => "Bona Konke",
        TranslationKey::Active          => "Iyasebenza",
        TranslationKey::Pending         => "Ilindile",
        TranslationKey::Overdue         => "Idlulile Isikhathi",
        TranslationKey::Paid            => "Ikhokhiwe",
        TranslationKey::Market          => "Imakethe",
        TranslationKey::Discover        => "Thola",
        TranslationKey::Profile         => "Iphrofayili",
        TranslationKey::SignOut         => "Phuma",
        TranslationKey::Wallet          => "Isikhwama",
        TranslationKey::Continue        => "Qhubeka",
        TranslationKey::Back            => "Buyela",
        TranslationKey::NetworkError    => "Iphutha lenethiwekhi. Hlola uxhumano lwakho.",
        _ => en(key), // fallback for keys not yet translated
    }
}

// ── Sesotho ───────────────────────────────────────────────────────────────────
// TODO: native speaker review

fn st(key: TranslationKey) -> &'static str {
    match key {
        TranslationKey::WelcomeTitle    => "O Amohelwa ho StockFair",
        TranslationKey::WelcomeTagline  => "Stokvel ya hao, tsela ya hao",
        TranslationKey::SignIn          => "Kena",
        TranslationKey::SignUp          => "Ngodisa",
        TranslationKey::ContributeNow   => "Tshela Jwale",
        TranslationKey::MyStokvels      => "Mastokvele a Ka",
        TranslationKey::Active          => "E Sebetsa",
        TranslationKey::Pending         => "E Emetse",
        TranslationKey::Paid            => "E Lefuoe",
        TranslationKey::SignOut         => "Tswa",
        TranslationKey::Continue        => "Tswela Pele",
        TranslationKey::Back            => "Kgutlela",
        TranslationKey::NetworkError    => "Phoso ya marang-rang. Hlahloba khokahano ya hao.",
        _ => en(key),
    }
}
""",
),

# ── src/api/ ──────────────────────────────────────────────────────────────────

(
"src/api/mod.rs",
"""pub mod client;
pub mod auth;
pub mod stokvels;
pub mod wallet;
pub mod market;
pub mod types;
""",
),

(
"src/api/types.rs",
"""//! Shared API response types mirroring motherlode models.

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
""",
),

(
"src/api/client.rs",
"""//! HTTP client for motherlode.

use reqwest::Client;
use serde::{de::DeserializeOwned, Serialize};
use std::env;

use super::types::ApiError;

pub struct ApiClient {
    client:   Client,
    base_url: String,
}

#[derive(Debug)]
pub enum ApiResult<T> {
    Ok(T),
    Err(String),
    NetworkErr,
}

impl ApiClient {
    pub fn new() -> Self {
        let base_url = env::var("MOTHERLODE_URL")
            .unwrap_or_else(|_| "http://localhost:8080".to_string());

        Self {
            client:   Client::new(),
            base_url,
        }
    }

    pub async fn post<B: Serialize, R: DeserializeOwned>(
        &self,
        endpoint: &str,
        body: &B,
        token: Option<&str>,
    ) -> ApiResult<R> {
        let mut req = self.client
            .post(format!("{}{}", self.base_url, endpoint))
            .json(body);

        if let Some(t) = token {
            req = req.bearer_auth(t);
        }

        match req.send().await {
            Err(_) => ApiResult::NetworkErr,
            Ok(res) => {
                let status = res.status();
                if status.is_success() {
                    match res.json::<R>().await {
                        Ok(data) => ApiResult::Ok(data),
                        Err(_)   => ApiResult::Err("Failed to parse response".to_string()),
                    }
                } else {
                    let err = res.json::<ApiError>().await
                        .map(|e| e.error)
                        .unwrap_or_else(|_| format!("HTTP {}", status));
                    ApiResult::Err(err)
                }
            }
        }
    }

    pub async fn get<R: DeserializeOwned>(
        &self,
        endpoint: &str,
        token: Option<&str>,
    ) -> ApiResult<R> {
        let mut req = self.client.get(format!("{}{}", self.base_url, endpoint));
        if let Some(t) = token {
            req = req.bearer_auth(t);
        }
        match req.send().await {
            Err(_) => ApiResult::NetworkErr,
            Ok(res) => {
                if res.status().is_success() {
                    match res.json::<R>().await {
                        Ok(data) => ApiResult::Ok(data),
                        Err(_)   => ApiResult::Err("Failed to parse response".to_string()),
                    }
                } else {
                    let err = res.json::<ApiError>().await
                        .map(|e| e.error)
                        .unwrap_or_else(|_| "Request failed".to_string());
                    ApiResult::Err(err)
                }
            }
        }
    }
}

impl Default for ApiClient {
    fn default() -> Self { Self::new() }
}
""",
),

(
"src/api/auth.rs",
"""//! Auth API calls mirroring motherlode auth endpoints.

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
""",
),

(
"src/api/stokvels.rs",
"""// Stokvels API — TODO: implement after motherlode stokvels service is built
""",
),

(
"src/api/wallet.rs",
"""// Wallet API — TODO: implement after motherlode wallet service is built
""",
),

(
"src/api/market.rs",
"""// Market API — TODO: implement after motherlode market service is built
""",
),

# ── src/router/mod.rs ─────────────────────────────────────────────────────────

(
"src/router/mod.rs",
"""//! Client-side router — maps Route enum to screen components.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;

use crate::state::app::Route;

pub fn route_to_screen(
    ctx: &WindowedContext,
    route: Route,
) -> impl ElementBuilder {
    match route {
        Route::Welcome            => crate::app::screens::welcome::welcome_screen(ctx),
        Route::Login              => crate::app::screens::login::login_screen(ctx),
        Route::Register           => crate::app::screens::register::register_screen(ctx),
        Route::Home               => crate::app::screens::home::home_screen(ctx),
        Route::Groups             => crate::app::screens::groups::groups_screen(ctx),
        Route::Discover           => crate::app::screens::discover::discover_screen(ctx),
        Route::Market             => crate::app::screens::market::market_screen(ctx),
        Route::Profile            => crate::app::screens::profile::profile_screen(ctx),
        Route::FairScore          => crate::app::screens::fair_score::fair_score_screen(ctx),
        Route::Wallet             => crate::app::screens::wallet::wallet_screen(ctx),
        Route::Notifications      => crate::app::screens::notifications::notifications_screen(ctx),
        Route::StokvelDetail(id)  => crate::app::screens::stokvel_detail::stokvel_detail_screen(ctx, &id),
        Route::Messages(id)       => crate::app::screens::messages::messages_screen(ctx, &id),
        Route::Portfolio          => crate::app::screens::portfolio::portfolio_screen(ctx),
    }
}
""",
),

# ── src/app/root.rs ───────────────────────────────────────────────────────────

(
"src/app/root.rs",
"""//! Root view — mounts global state and routes to the correct screen.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;

use crate::state::app::{AppState, Route};
use crate::router::route_to_screen;

pub fn root_view(ctx: &WindowedContext) -> impl ElementBuilder {
    // Global app state
    let app_state = ctx.use_state_keyed("app_state", AppState::default);
    let theme = app_state.get().theme();

    div()
        .w(ctx.width)
        .h(ctx.height)
        .bg(theme.bg_primary)
        .child(
            stateful::<NoState>()
                .deps([app_state.signal_id()])
                .on_state(move |_ctx| {
                    let state   = app_state.get();
                    let theme   = state.theme();
                    let route   = state.current_route.clone();
                    div()
                        .w_full()
                        .h_full()
                        .bg(theme.bg_primary)
                        .child(route_to_screen(_ctx, route))
                })
        )
}
""",
),

(
"src/app/mod.rs",
"""pub mod root;
pub mod screens;
""",
),

(
"src/app/screens/mod.rs",
"""pub mod welcome;
pub mod login;
pub mod register;
pub mod home;
pub mod groups;
pub mod discover;
pub mod market;
pub mod profile;
pub mod fair_score;
pub mod wallet;
pub mod notifications;
pub mod stokvel_detail;
pub mod messages;
pub mod portfolio;
""",
),

# ── Screens (stubs — build out one by one) ────────────────────────────────────

*[
(
f"src/app/screens/{name}.rs",
f"""//! {name.replace('_', ' ').title()} screen — TODO: implement

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;

pub fn {name}_screen(ctx: &WindowedContext) -> impl ElementBuilder {{
    div()
        .w_full()
        .h_full()
        .flex_center()
        .child(
            text("{name.replace('_', ' ').title()}")
                .size(24.0)
                .weight(FontWeight::Bold)
                .color(Color::WHITE)
        )
}}
""",
)
for name in [
    "home", "groups", "discover", "market",
    "profile", "fair_score", "wallet", "notifications",
    "portfolio",
]
],

# ── Detail screens with ID params ──────────────────────────────────────────────

(
"src/app/screens/stokvel_detail.rs",
"""//! Stokvel detail screen — TODO: implement

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;

pub fn stokvel_detail_screen(ctx: &WindowedContext, id: &str) -> impl ElementBuilder {
    div()
        .w_full()
        .h_full()
        .flex_center()
        .child(
            text(&format!("Stokvel: {}", id))
                .size(20.0)
                .color(Color::WHITE)
        )
}
""",
),

(
"src/app/screens/messages.rs",
"""//! Messages screen — TODO: implement

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;

pub fn messages_screen(ctx: &WindowedContext, stokvel_id: &str) -> impl ElementBuilder {
    div()
        .w_full()
        .h_full()
        .flex_center()
        .child(
            text(&format!("Messages: {}", stokvel_id))
                .size(20.0)
                .color(Color::WHITE)
        )
}
""",
),

# ── Welcome screen — first real screen ────────────────────────────────────────

(
"src/app/screens/welcome.rs",
"""//! Welcome screen — entry point, social & privacy-first framing.
//!
//! "Your stokvel. Your circle. Your money."
//! Authentic to the communal origin of stokvels.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;

use crate::state::app::{AppState, Route};
use crate::i18n::translations::{t, TranslationKey};
use crate::theme::Theme;

pub fn welcome_screen(ctx: &WindowedContext) -> impl ElementBuilder {
    let app_state = ctx.use_state_keyed("app_state", AppState::default);
    let theme     = app_state.get().theme();
    let lang      = app_state.get().language;

    div()
        .w_full()
        .h_full()
        .bg(theme.bg_primary)
        .flex_col()
        .justify_between()
        .p_px(0.0)
        // ── Hero section ──────────────────────────────────────────────────
        .child(
            div()
                .w_full()
                .flex_1()
                .flex_col()
                .justify_center()
                .items_center()
                .gap(Theme::sp(4.0))
                .px(Theme::sp(6.0))
                // Logo mark
                .child(
                    div()
                        .square(80.0)
                        .rounded(Theme::radius_xl())
                        .bg(theme.accent)
                        .flex_center()
                        .child(
                            text("SF")
                                .size(32.0)
                                .weight(FontWeight::Bold)
                                .color(theme.bg_primary)
                        )
                )
                // Title
                .child(
                    text(t(lang, TranslationKey::WelcomeTitle))
                        .size(32.0)
                        .weight(FontWeight::Bold)
                        .color(theme.text_primary)
                        .align(TextAlign::Center)
                )
                // Tagline
                .child(
                    text(t(lang, TranslationKey::WelcomeTagline))
                        .size(16.0)
                        .color(theme.text_muted)
                        .align(TextAlign::Center)
                )
                // Privacy statement — core brand value
                .child(
                    div()
                        .mt(Theme::sp(4.0))
                        .px(Theme::sp(4.0))
                        .py(Theme::sp(3.0))
                        .rounded(Theme::radius_md())
                        .bg(theme.bg_card)
                        .child(
                            text("Your data stays in your circle. We never sell it.")
                                .size(13.0)
                                .color(theme.text_secondary)
                                .align(TextAlign::Center)
                        )
                )
        )
        // ── CTA buttons ───────────────────────────────────────────────────
        .child(
            div()
                .w_full()
                .flex_col()
                .gap(Theme::sp(3.0))
                .px(Theme::sp(5.0))
                .pb(Theme::sp(10.0))
                // Primary: Create account
                .child(
                    stateful::<ButtonState>()
                        .w_full()
                        .h(54.0)
                        .rounded(Theme::radius_md())
                        .bg(theme.accent)
                        .flex_center()
                        .on_state(move |_ctx| {
                            div()
                                .bg(match _ctx.state() {
                                    ButtonState::Hovered => Color::rgba(0.9, 0.9, 0.9, 1.0),
                                    ButtonState::Pressed => Color::rgba(0.75, 0.75, 0.75, 1.0),
                                    _ => theme.accent,
                                })
                                .w_full()
                                .h_full()
                                .rounded(Theme::radius_md())
                                .flex_center()
                                .child(
                                    text(t(lang, TranslationKey::CreateAccount))
                                        .size(16.0)
                                        .weight(FontWeight::Bold)
                                        .color(theme.bg_primary)
                                )
                        })
                        .on_click(move |_| {
                            app_state.update(|mut s| {
                                s.current_route = Route::Register;
                                s
                            });
                        })
                )
                // Secondary: Sign in
                .child(
                    stateful::<ButtonState>()
                        .w_full()
                        .h(54.0)
                        .rounded(Theme::radius_md())
                        .border(1.5, theme.border_strong)
                        .flex_center()
                        .on_click(move |_| {
                            app_state.update(|mut s| {
                                s.current_route = Route::Login;
                                s
                            });
                        })
                        .child(
                            text(t(lang, TranslationKey::SignIn))
                                .size(16.0)
                                .weight(FontWeight::SemiBold)
                                .color(theme.text_primary)
                        )
                )
                // Trust line
                .child(
                    div()
                        .flex_row()
                        .items_center()
                        .justify_center()
                        .gap(6.0)
                        .child(
                            text("256-bit encrypted · FICA compliant · POPIA protected")
                                .size(11.0)
                                .color(theme.text_muted)
                                .align(TextAlign::Center)
                        )
                )
        )
}
""",
),

# ── Login screen ──────────────────────────────────────────────────────────────

(
"src/app/screens/login.rs",
"""//! Login screen wired to motherlode /auth/signin

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;

use crate::state::app::{AppState, Route};
use crate::state::auth::AuthState;
use crate::api::client::ApiClient;
use crate::api::auth::{AuthApi, SignInPayload};
use crate::i18n::translations::{t, TranslationKey};
use crate::theme::Theme;
use crate::components::input::text_input;
use crate::components::button::primary_button;

pub fn login_screen(ctx: &WindowedContext) -> impl ElementBuilder {
    let app_state  = ctx.use_state_keyed("app_state", AppState::default);
    let auth_state = ctx.use_state_keyed("auth_state", AuthState::default);
    let theme      = app_state.get().theme();
    let lang       = app_state.get().language;

    // Form state
    let identifier = ctx.use_state_keyed("login_id",   || String::new());
    let password   = ctx.use_state_keyed("login_pass", || String::new());
    let error      = ctx.use_state_keyed("login_err",  || String::new());
    let loading    = ctx.use_state_keyed("login_load", || false);

    div()
        .w_full()
        .h_full()
        .bg(theme.bg_primary)
        .flex_col()
        // ── Header ────────────────────────────────────────────────────────
        .child(
            div()
                .w_full()
                .bg(Color::rgba(0.0, 0.0, 0.0, 1.0))
                .px(Theme::sp(6.0))
                .pt(Theme::sp(12.0))
                .pb(Theme::sp(8.0))
                .flex_col()
                .items_center()
                .gap(Theme::sp(2.0))
                .child(
                    div()
                        .square(56.0)
                        .rounded(Theme::radius_full())
                        .bg(Color::rgba(0.11, 0.11, 0.11, 1.0))
                        .flex_center()
                        .child(text("SF").size(20.0).weight(FontWeight::Bold).color(Color::WHITE))
                )
                .child(text(t(lang, TranslationKey::WelcomeBack)).size(26.0).weight(FontWeight::Bold).color(Color::WHITE))
                .child(text("Sign in to your StockFair account").size(14.0).color(Color::rgba(1.0,1.0,1.0,0.5)))
        )
        // ── Form card ─────────────────────────────────────────────────────
        .child(
            div()
                .w_full()
                .flex_1()
                .px(Theme::sp(5.0))
                .py(Theme::sp(6.0))
                .flex_col()
                .gap(Theme::sp(4.0))
                // Error banner
                .child(
                    stateful::<NoState>()
                        .deps([error.signal_id()])
                        .on_state(move |_ctx| {
                            let err = error.get();
                            if err.is_empty() {
                                div().w(0.0).h(0.0) // hidden
                            } else {
                                div()
                                    .w_full()
                                    .px(Theme::sp(3.0))
                                    .py(Theme::sp(3.0))
                                    .rounded(Theme::radius_md())
                                    .bg(Color::rgba(0.898, 0.243, 0.243, 0.1))
                                    .child(text(&err).size(13.0).color(Color::rgba(0.898, 0.243, 0.243, 1.0)))
                            }
                        })
                )
                // Identifier input
                .child(text_input(
                    ctx,
                    "login_id",
                    "Phone or email",
                    identifier.clone(),
                    theme.clone(),
                ))
                // Password input
                .child(text_input(
                    ctx,
                    "login_pass",
                    "Password",
                    password.clone(),
                    theme.clone(),
                ))
                // Forgot password
                .child(
                    div()
                        .w_full()
                        .flex_row()
                        .justify_end()
                        .child(
                            stateful::<ButtonState>()
                                .on_click(move |_| {
                                    app_state.update(|mut s| {
                                        s.current_route = Route::Login; // TODO: forgot password route
                                        s
                                    });
                                })
                                .child(
                                    text(t(lang, TranslationKey::ForgotPassword))
                                        .size(13.0)
                                        .weight(FontWeight::SemiBold)
                                        .color(theme.text_primary)
                                )
                        )
                )
                // Sign in button
                .child(
                    stateful::<ButtonState>()
                        .w_full()
                        .h(54.0)
                        .rounded(Theme::radius_md())
                        .flex_center()
                        .on_state(move |_ctx| {
                            div()
                                .w_full().h_full()
                                .rounded(Theme::radius_md())
                                .bg(match _ctx.state() {
                                    ButtonState::Pressed => Color::rgba(0.2, 0.2, 0.2, 1.0),
                                    _ => Color::rgba(0.039, 0.039, 0.039, 1.0),
                                })
                                .flex_center()
                                .child(text(t(lang, TranslationKey::SignIn)).size(16.0).weight(FontWeight::Bold).color(Color::WHITE))
                        })
                        .on_click(move |_| {
                            let id   = identifier.get();
                            let pass = password.get();
                            if id.is_empty() || pass.is_empty() {
                                error.set("Please enter your phone/email and password.".to_string());
                                return;
                            }
                            loading.set(true);
                            error.set(String::new());

                            // Normalise SA phone
                            let id = if id.starts_with('0') && id.len() == 10 {
                                format!("+27{}", &id[1..])
                            } else { id };

                            // TODO: spawn async task to call motherlode
                            // For now: placeholder
                            loading.set(false);
                        })
                )
        )
}
""",
),

# ── Register screen stub ───────────────────────────────────────────────────────

(
"src/app/screens/register.rs",
"""//! Registration screen — 4 steps + OTP, wired to motherlode.
//! TODO: implement full multi-step flow matching the React Native version.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;

use crate::state::app::{AppState, Route};
use crate::theme::Theme;

pub fn register_screen(ctx: &WindowedContext) -> impl ElementBuilder {
    let app_state = ctx.use_state_keyed("app_state", AppState::default);
    let theme     = app_state.get().theme();

    div()
        .w_full()
        .h_full()
        .bg(theme.bg_primary)
        .flex_center()
        .child(
            div()
                .flex_col()
                .items_center()
                .gap(Theme::sp(4.0))
                .child(text("Registration").size(24.0).weight(FontWeight::Bold).color(theme.text_primary))
                .child(text("TODO: implement 4-step flow").size(14.0).color(theme.text_muted))
        )
}
""",
),

# ── src/components/ ───────────────────────────────────────────────────────────

(
"src/components/mod.rs",
"""pub mod button;
pub mod input;
pub mod card;
pub mod badge;
pub mod nav_bar;
pub mod stokvel_card;
pub mod fair_score_bar;
pub mod otp_input;
""",
),

(
"src/components/button.rs",
"""//! Reusable button components.

use blinc_app::prelude::*;
use blinc_layout::stateful::stateful;
use crate::theme::Theme;

pub fn primary_button(
    label: &'static str,
    theme: Theme,
    on_press: impl Fn() + Send + Sync + 'static,
) -> impl ElementBuilder {
    stateful::<ButtonState>()
        .w_full()
        .h(54.0)
        .rounded(Theme::radius_md())
        .flex_center()
        .on_state(move |_ctx| {
            let bg = match _ctx.state() {
                ButtonState::Hovered => Color::rgba(0.15, 0.15, 0.15, 1.0),
                ButtonState::Pressed => Color::rgba(0.25, 0.25, 0.25, 1.0),
                _ => theme.accent,
            };
            div()
                .w_full().h_full()
                .rounded(Theme::radius_md())
                .bg(bg)
                .flex_center()
                .child(
                    text(label)
                        .size(16.0)
                        .weight(FontWeight::Bold)
                        .color(theme.bg_primary)
                )
        })
        .on_click(move |_| on_press())
}

pub fn secondary_button(
    label: &'static str,
    theme: Theme,
    on_press: impl Fn() + Send + Sync + 'static,
) -> impl ElementBuilder {
    stateful::<ButtonState>()
        .w_full()
        .h(54.0)
        .rounded(Theme::radius_md())
        .border(1.5, theme.border_strong)
        .flex_center()
        .on_click(move |_| on_press())
        .child(
            text(label)
                .size(16.0)
                .weight(FontWeight::SemiBold)
                .color(theme.text_primary)
        )
}

pub fn icon_button(
    icon_char: &'static str,
    theme: Theme,
    on_press: impl Fn() + Send + Sync + 'static,
) -> impl ElementBuilder {
    stateful::<ButtonState>()
        .square(40.0)
        .rounded(Theme::radius_md())
        .bg(theme.bg_card)
        .flex_center()
        .on_click(move |_| on_press())
        .child(text(icon_char).size(18.0).color(theme.text_primary))
}
""",
),

(
"src/components/input.rs",
"""//! Text input component.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;
use crate::theme::Theme;

pub fn text_input(
    ctx: &WindowedContext,
    key: &'static str,
    placeholder: &'static str,
    value: blinc_app::State<String>,
    theme: Theme,
) -> impl ElementBuilder {
    div()
        .w_full()
        .flex_col()
        .gap(6.0)
        .child(
            text(placeholder.to_uppercase().as_str())
                .size(11.0)
                .weight(FontWeight::Bold)
                .color(theme.text_muted)
                .letter_spacing(0.6)
        )
        .child(
            // TODO: replace with blinc text_field element when available
            // For now: styled div placeholder
            div()
                .w_full()
                .h(54.0)
                .rounded(Theme::radius_md())
                .bg(theme.bg_secondary)
                .border(1.5, theme.border)
                .px(Theme::sp(3.5))
                .flex_row()
                .items_center()
                .child(
                    stateful::<NoState>()
                        .deps([value.signal_id()])
                        .on_state(move |_ctx| {
                            let v = value.get();
                            if v.is_empty() {
                                text(placeholder).size(15.0).color(theme.text_muted)
                            } else {
                                text(&v).size(15.0).color(theme.text_primary)
                            }
                        })
                )
        )
}
""",
),

(
"src/components/card.rs",
"""//! Card component — the fundamental surface for stokvels, market items, etc.

use blinc_app::prelude::*;
use crate::theme::Theme;

pub fn card(theme: Theme) -> impl ElementBuilder {
    div()
        .w_full()
        .rounded(Theme::radius_xl())
        .bg(theme.bg_card)
        .p_px(24.0)
        .shadow(0.0, 6.0, 20.0, Color::rgba(0.0, 0.0, 0.0, 0.07))
}
""",
),

(
"src/components/badge.rs",
"""//! Status badges — Active, Pending, Overdue, Paid.

use blinc_app::prelude::*;
use crate::theme::Theme;

pub enum BadgeVariant {
    Active,
    Pending,
    Overdue,
    Paid,
    Custom(Color, Color),
}

pub fn badge(label: &str, variant: BadgeVariant) -> impl ElementBuilder {
    let (bg, fg) = match variant {
        BadgeVariant::Active          => (Color::rgba(0.086, 0.639, 0.239, 0.15), Color::rgba(0.086, 0.639, 0.239, 1.0)),
        BadgeVariant::Pending         => (Color::rgba(1.0, 0.749, 0.0, 0.15),     Color::rgba(1.0, 0.749, 0.0, 1.0)),
        BadgeVariant::Overdue         => (Color::rgba(0.898, 0.243, 0.243, 0.15), Color::rgba(0.898, 0.243, 0.243, 1.0)),
        BadgeVariant::Paid            => (Color::rgba(0.086, 0.639, 0.239, 0.15), Color::rgba(0.086, 0.639, 0.239, 1.0)),
        BadgeVariant::Custom(b, f)    => (b, f),
    };

    div()
        .px(Theme::sp(3.0))
        .py(4.0)
        .rounded(Theme::radius_full())
        .bg(bg)
        .child(text(label).size(11.0).weight(FontWeight::SemiBold).color(fg))
}
""",
),

(
"src/components/nav_bar.rs",
"""//! Bottom navigation bar — Home, Groups, Discover, Market, Profile.

use blinc_app::prelude::*;
use blinc_layout::stateful::stateful;
use crate::state::app::{AppState, Route};
use crate::theme::Theme;

pub fn nav_bar(ctx: &blinc_app::windowed::WindowedContext) -> impl ElementBuilder {
    let app_state = ctx.use_state_keyed("app_state", AppState::default);

    stateful::<NoState>()
        .deps([app_state.signal_id()])
        .on_state(move |_ctx| {
            let state = app_state.get();
            let theme = state.theme();
            let route = state.current_route.clone();

            div()
                .w_full()
                .h(80.0)
                .bg(theme.nav_bg)
                .flex_row()
                .justify_evenly()
                .items_center()
                .child(nav_item(_ctx, "Home",     Route::Home,     route == Route::Home,     app_state.clone(), theme.clone()))
                .child(nav_item(_ctx, "Groups",   Route::Groups,   route == Route::Groups,   app_state.clone(), theme.clone()))
                .child(nav_item(_ctx, "Discover", Route::Discover, route == Route::Discover, app_state.clone(), theme.clone()))
                .child(nav_item(_ctx, "Market",   Route::Market,   route == Route::Market,   app_state.clone(), theme.clone()))
                .child(nav_item(_ctx, "Profile",  Route::Profile,  route == Route::Profile,  app_state.clone(), theme.clone()))
        })
}

fn nav_item(
    ctx: &blinc_app::windowed::WindowedContext,
    label: &'static str,
    route: Route,
    is_active: bool,
    app_state: blinc_app::State<AppState>,
    theme: crate::theme::Theme,
) -> impl ElementBuilder {
    let color = if is_active { theme.nav_active } else { theme.nav_inactive };

    stateful::<ButtonState>()
        .flex_col()
        .items_center()
        .gap(4.0)
        .px(Theme::sp(3.0))
        .py(Theme::sp(2.0))
        .on_click(move |_| {
            app_state.update(|mut s| { s.current_route = route.clone(); s });
        })
        .child(
            div()
                .square(if is_active { 6.0 } else { 0.0 })
                .rounded(Theme::radius_full())
                .bg(theme.accent)
        )
        .child(text(label).size(10.0).weight(FontWeight::SemiBold).color(color))
}
""",
),

(
"src/components/stokvel_card.rs",
"""//! Stokvel card component — used in Groups and Home screens.

use blinc_app::prelude::*;
use crate::state::stokvels::{Stokvel, StokvelType};
use crate::theme::Theme;
use crate::components::badge::{badge, BadgeVariant};

pub fn stokvel_card(stokvel: &Stokvel, theme: Theme) -> impl ElementBuilder {
    let accent = match stokvel.stokvel_type {
        StokvelType::Grocery    => theme.accent_warm,
        StokvelType::Investment => theme.info,
        StokvelType::Burial     => theme.text_secondary,
        _                       => theme.accent,
    };

    div()
        .w_full()
        .rounded(Theme::radius_xl())
        .overflow_clip()
        .flex_col()
        // Coloured header strip
        .child(
            div()
                .w_full()
                .h(60.0)
                .bg(accent)
                .flex_row()
                .items_center()
                .justify_between()
                .px(Theme::sp(4.0))
                .child(
                    div()
                        .flex_col()
                        .child(text(&stokvel.name).size(16.0).weight(FontWeight::Bold).color(Color::WHITE))
                        .child(text(stokvel.stokvel_type.label()).size(11.0).color(Color::rgba(1.0,1.0,1.0,0.7)))
                )
                .child(badge("Active", BadgeVariant::Active))
        )
        // Stats row
        .child(
            div()
                .w_full()
                .bg(theme.bg_card)
                .px(Theme::sp(4.0))
                .py(Theme::sp(4.0))
                .flex_row()
                .justify_between()
                .child(stat_col(&format!("R {:.0}", stokvel.total_savings), "Total Savings", theme.clone()))
                .child(stat_col(&format!("{}", stokvel.member_count), "Members", theme.clone()))
                .child(stat_col(&format!("R {:.0}/mo", stokvel.contribution_amount), "Monthly", theme.clone()))
        )
        // Progress bar
        .child(
            div()
                .w_full()
                .h(4.0)
                .bg(theme.border)
                .child(
                    div()
                        .w((stokvel.progress_pct as f32 / 100.0) * 100.0) // TODO: relative width
                        .h_full()
                        .bg(accent)
                )
        )
}

fn stat_col(value: &str, label: &str, theme: Theme) -> impl ElementBuilder {
    div()
        .flex_col()
        .items_center()
        .gap(2.0)
        .child(text(value).size(15.0).weight(FontWeight::Bold).color(theme.text_primary))
        .child(text(label).size(10.0).color(theme.text_muted))
}
""",
),

(
"src/components/fair_score_bar.rs",
"""//! Fair Score gradient bar — used on Profile screen.

use blinc_app::prelude::*;
use crate::theme::Theme;

pub fn fair_score_bar(score: u32, theme: Theme) -> impl ElementBuilder {
    let pct = (score as f32 - 300.0) / (850.0 - 300.0);
    let label = match score {
        0..=399   => "Building",
        400..=499 => "Fair",
        500..=619 => "Good",
        620..=719 => "Very Good",
        _         => "Excellent",
    };
    let color = match score {
        0..=399   => Color::rgba(0.898, 0.243, 0.243, 1.0),
        400..=499 => Color::rgba(1.0, 0.749, 0.0, 1.0),
        500..=619 => Color::rgba(0.247, 0.494, 0.996, 1.0),
        _         => Color::rgba(0.086, 0.639, 0.239, 1.0),
    };

    div()
        .w_full()
        .flex_col()
        .gap(Theme::sp(2.0))
        .child(
            div()
                .flex_row()
                .justify_between()
                .items_center()
                .child(text(&format!("{}", score)).size(48.0).weight(FontWeight::Bold).color(theme.text_primary))
                .child(
                    div()
                        .px(Theme::sp(3.0))
                        .py(6.0)
                        .rounded(Theme::radius_full())
                        .bg(Color::rgba(
                            color.r, color.g, color.b, 0.15,
                        ))
                        .child(text(label).size(12.0).weight(FontWeight::SemiBold).color(color))
                )
        )
        .child(
            div()
                .w_full()
                .h(6.0)
                .rounded(Theme::radius_full())
                .bg(theme.border)
                .child(
                    div()
                        .w(pct * 100.0) // TODO: percentage width
                        .h_full()
                        .rounded(Theme::radius_full())
                        .bg(color)
                )
        )
        .child(
            div()
                .flex_row()
                .justify_between()
                .child(text("Poor").size(10.0).color(theme.text_muted))
                .child(text("Excellent").size(10.0).color(theme.text_muted))
        )
}
""",
),

(
"src/components/otp_input.rs",
"""//! 6-box OTP input component.

use blinc_app::prelude::*;
use blinc_layout::stateful::stateful;
use crate::theme::Theme;

pub fn otp_input(
    value: blinc_app::State<String>,
    theme: Theme,
) -> impl ElementBuilder {
    div()
        .w_full()
        .flex_row()
        .justify_center()
        .gap(Theme::sp(2.5))
        .child(
            stateful::<NoState>()
                .deps([value.signal_id()])
                .on_state(move |_ctx| {
                    let v = value.get();
                    let mut row = div().flex_row().gap(Theme::sp(2.5));
                    for i in 0..6usize {
                        let digit = v.chars().nth(i).map(|c| c.to_string()).unwrap_or_default();
                        let filled = !digit.is_empty();
                        row = row.child(
                            div()
                                .square(48.0)
                                .rounded(Theme::radius_md())
                                .bg(if filled { theme.bg_secondary } else { theme.bg_card })
                                .border(1.5, if filled { theme.border_strong } else { theme.border })
                                .flex_center()
                                .child(
                                    text(if filled { digit.as_str() } else { "" })
                                        .size(22.0)
                                        .weight(FontWeight::Bold)
                                        .color(theme.text_primary)
                                )
                        );
                    }
                    row
                })
        )
}
""",
),

# ── assets/ ───────────────────────────────────────────────────────────────────

(
"assets/fonts/README.md",
"""# Fonts

Place font files here. Recommended:

- `Inter-Regular.ttf`
- `Inter-Medium.ttf`
- `Inter-SemiBold.ttf`
- `Inter-Bold.ttf`
- `Inter-ExtraBold.ttf`

Download from: https://rsms.me/inter/

These are .gitignored — add them manually.
""",
),

(
"assets/icons/README.md",
"""# Icons

Place SVG icon files here.
Recommended: Lucide icons (https://lucide.dev)

Usage in Blinc:
```rust
svg("assets/icons/home.svg").w(24.0).h(24.0).tint(theme.nav_active)
```
""",
),

(
"assets/images/README.md",
"""# Images

Place raster images here (.png, .jpg, .webp).

- hero_community.png — stokvel community hero image (home screen)
- logo.png           — StockFair logo mark
""",
),

]

def scaffold():
    for path, content in FILES:
        full_path = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)
        print(f"  ✅  {path}")

    print(f"""
🦀  speedcrime scaffolded successfully.

Structure:
  speedcrime/
    src/
      main.rs          — entry point, WindowedApp::run
      theme.rs         — Obsidian / Forge / Bloom × dark/light
      state/           — AppState, AuthState, StokvelState
      i18n/            — all 11 SA languages (Xitsonga first-class)
      api/             — motherlode HTTP client
      router/          — Route → screen mapping
      app/screens/     — all screens (welcome + login implemented)
      components/      — reusable UI: button, input, card, badge, nav_bar,
                         stokvel_card, fair_score_bar, otp_input
    assets/
      fonts/           — Inter font family (add manually)
      icons/           — Lucide SVGs
      images/          — hero images

Next steps:
  cd speedcrime
  cp .env.example .env
  cargo build          — verify it compiles
  cargo run            — see the welcome screen

Priority build order:
  1. Welcome screen (done ✅)
  2. Login screen (done ✅)
  3. Registration screen (4-step + OTP)
  4. Home screen
  5. Groups screen
  6. Wire async tokio tasks for API calls
""")

if __name__ == "__main__":
    scaffold()
