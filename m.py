#!/usr/bin/env python3
"""
motherlode — StockFair Backend Scaffold
Axum + SeaORM + PostgreSQL + Redis
"""

import os

ROOT = "motherlode"

# (path, content)
FILES = [

# ── Root ──────────────────────────────────────────────────────────────────────

(
"Cargo.toml",
"""[package]
name = "motherlode"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web
axum = { version = "0.7", features = ["macros"] }
axum-extra = { version = "0.9", features = ["typed-header"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace", "compression-gzip"] }
tokio = { version = "1", features = ["full"] }
hyper = "1"

# Database
sea-orm = { version = "0.12", features = ["sqlx-postgres", "runtime-tokio-rustls", "macros"] }
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "migrate"] }

# Redis
redis = { version = "0.25", features = ["tokio-comp", "connection-manager"] }

# Auth
jsonwebtoken = "9"
argon2 = "0.5"
rand = "0.8"

# Validation
validator = { version = "0.18", features = ["derive"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Observability
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }

# Utils
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
dotenvy = "0.15"
thiserror = "1"
anyhow = "1"
async-trait = "0.1"
reqwest = { version = "0.11", features = ["json", "rustls-tls"] }
rust_decimal = { version = "1", features = ["serde-with-str"] }

[dev-dependencies]
axum-test = "14"
tokio-test = "0.4"
""",
),

(
".env.example",
"""# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/motherlode
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=change_me_in_production
JWT_EXPIRY_HOURS=24
REFRESH_TOKEN_EXPIRY_DAYS=30

# App
APP_ENV=development
APP_PORT=8080
APP_HOST=0.0.0.0

# Payment Provider (active provider: ukheshe | internal)
PAYMENT_PROVIDER=ukheshe

# Ukheshe
UKHESHE_BASE_URL=https://api.ukheshe.com
UKHESHE_CLIENT_ID=
UKHESHE_CLIENT_SECRET=
UKHESHE_WEBHOOK_SECRET=

# Internal Payments (future — post-FSP license)
INTERNAL_PAYMENTS_ENABLED=false

# FICA / KYC
KYC_PROVIDER_URL=
KYC_API_KEY=

# SIM Swap
SIM_SWAP_API_URL=
SIM_SWAP_API_KEY=

# Notifications
FCM_SERVER_KEY=
SENDGRID_API_KEY=
WHATSAPP_API_URL=
WHATSAPP_TOKEN=

# SARS / Tax
TAX_FREE_INTEREST_LIMIT=23800
""",
),

(
".gitignore",
""".env
target/
*.log
*.pem
*.key
""",
),

(
"README.md",
"""# motherlode

StockFair backend API — Axum + SeaORM + PostgreSQL + Redis.

## Setup
```bash
cp .env.example .env
# fill in your values

sqlx database create
sqlx migrate run

cargo run
```

## Structure
See `src/` — routes → handlers → services → repositories.
Payment providers are fully swappable via the `PaymentProvider` trait.
""",
),

# ── Migrations ────────────────────────────────────────────────────────────────

(
"migrations/001_users.sql",
"""-- Users & identity
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone           VARCHAR(20) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    pin_hash        TEXT,
    language        VARCHAR(10) NOT NULL DEFAULT 'en',
    theme           VARCHAR(20) NOT NULL DEFAULT 'obsidian',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE kyc_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | verified | rejected
    id_number       VARCHAR(20),
    id_type         VARCHAR(20),  -- sa_id | passport
    proof_of_residence_url TEXT,
    verified_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""",
),

(
"migrations/002_stokvels.sql",
"""-- Stokvels & membership
CREATE TYPE stokvel_type AS ENUM ('grocery', 'rotating', 'burial', 'investment', 'savings');
CREATE TYPE stokvel_status AS ENUM ('active', 'paused', 'closed');
CREATE TYPE member_role AS ENUM ('chairperson', 'secretary', 'treasurer', 'member');
CREATE TYPE member_status AS ENUM ('active', 'pending', 'suspended', 'exited');

CREATE TABLE stokvels (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255) NOT NULL,
    type                stokvel_type NOT NULL,
    status              stokvel_status NOT NULL DEFAULT 'active',
    description         TEXT,
    avatar_url          TEXT,
    contribution_amount NUMERIC(12,2) NOT NULL,
    contribution_day    INTEGER NOT NULL,  -- day of month
    max_members         INTEGER,
    payout_schedule     JSONB,  -- flexible payout config
    rules               TEXT,
    constitution_signed_at TIMESTAMPTZ,
    created_by          UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE stokvel_members (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id  UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        member_role NOT NULL DEFAULT 'member',
    status      member_status NOT NULL DEFAULT 'active',
    payout_position INTEGER,  -- for rotating stokvels
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exited_at   TIMESTAMPTZ,
    UNIQUE(stokvel_id, user_id)
);

CREATE TABLE stokvel_wallets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id  UUID NOT NULL UNIQUE REFERENCES stokvels(id) ON DELETE CASCADE,
    balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE multisig_approvals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id      UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    action_type     VARCHAR(50) NOT NULL,  -- withdrawal | bulk_order | rule_change
    action_payload  JSONB NOT NULL,
    requested_by    UUID NOT NULL REFERENCES users(id),
    approvals       JSONB NOT NULL DEFAULT '[]',  -- array of {user_id, approved_at}
    required_count  INTEGER NOT NULL DEFAULT 2,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected | executed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);
""",
),

(
"migrations/003_contributions.sql",
"""-- Contributions & payouts
CREATE TYPE contribution_status AS ENUM ('pending', 'paid', 'overdue', 'waived');
CREATE TYPE payout_status AS ENUM ('scheduled', 'processing', 'completed', 'failed');

CREATE TABLE contributions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id      UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2) NOT NULL,
    due_date        DATE NOT NULL,
    paid_at         TIMESTAMPTZ,
    status          contribution_status NOT NULL DEFAULT 'pending',
    fine_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_ref     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payouts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id      UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    recipient_id    UUID NOT NULL REFERENCES users(id),
    amount          NUMERIC(12,2) NOT NULL,
    scheduled_for   DATE NOT NULL,
    paid_at         TIMESTAMPTZ,
    status          payout_status NOT NULL DEFAULT 'scheduled',
    payment_ref     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auto_pay_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stokvel_id      UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    is_enabled      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, stokvel_id)
);
""",
),

(
"migrations/004_market.sql",
"""-- Market & bulk orders
CREATE TYPE order_status AS ENUM ('pending_votes', 'approved', 'processing', 'fulfilled', 'cancelled');

CREATE TABLE retailers (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    logo_url    TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE market_products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id     UUID NOT NULL REFERENCES retailers(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       TEXT,
    price           NUMERIC(12,2) NOT NULL,
    unit            VARCHAR(50) NOT NULL,
    min_quantity    INTEGER NOT NULL DEFAULT 1,
    discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
    category        VARCHAR(100),
    is_available    BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id      UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    retailer_id     UUID NOT NULL REFERENCES retailers(id),
    items           JSONB NOT NULL,  -- [{product_id, quantity, unit_price}]
    total_amount    NUMERIC(12,2) NOT NULL,
    status          order_status NOT NULL DEFAULT 'pending_votes',
    delivery_option VARCHAR(20) NOT NULL DEFAULT 'collection',  -- collection | delivery
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_votes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    vote        BOOLEAN NOT NULL,
    voted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id, user_id)
);

CREATE TABLE collection_codes (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID NOT NULL REFERENCES group_orders(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    code        VARCHAR(20) NOT NULL UNIQUE,
    is_used     BOOLEAN NOT NULL DEFAULT false,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""",
),

(
"migrations/005_wallet.sql",
"""-- User wallets & transactions
CREATE TYPE tx_type AS ENUM ('deposit', 'withdrawal', 'contribution', 'payout', 'transfer', 'refund', 'fee');
CREATE TYPE tx_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

CREATE TABLE user_wallets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance     NUMERIC(12,2) NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    type            tx_type NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    fee             NUMERIC(12,2) NOT NULL DEFAULT 0,
    status          tx_status NOT NULL DEFAULT 'pending',
    reference       TEXT UNIQUE,
    provider_ref    TEXT,
    stokvel_id      UUID REFERENCES stokvels(id),
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE linked_bank_accounts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_name    VARCHAR(255) NOT NULL,
    account_number  VARCHAR(50) NOT NULL,
    bank_name       VARCHAR(100) NOT NULL,
    branch_code     VARCHAR(20),
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""",
),

(
"migrations/006_fair_score.sql",
"""-- Fair Score system
CREATE TABLE fair_scores (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    score               INTEGER NOT NULL DEFAULT 380,
    payment_history     INTEGER NOT NULL DEFAULT 0,
    consistency         INTEGER NOT NULL DEFAULT 0,
    group_activity      INTEGER NOT NULL DEFAULT 0,
    member_tenure       INTEGER NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fair_score_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score       INTEGER NOT NULL,
    delta       INTEGER NOT NULL,
    reason      TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""",
),

(
"migrations/007_messaging.sql",
"""-- Group chat & notifications
CREATE TYPE message_type AS ENUM ('text', 'voice_note', 'system', 'order_vote', 'payout_notice');

CREATE TABLE messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id  UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    sender_id   UUID REFERENCES users(id),
    type        message_type NOT NULL DEFAULT 'text',
    content     TEXT,
    media_url   TEXT,
    metadata    JSONB,  -- for order_vote type: {order_id}
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    type        VARCHAR(50) NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""",
),

(
"migrations/008_discover.sql",
"""-- Discover / public stokvel listings
CREATE TABLE stokvel_listings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id      UUID NOT NULL UNIQUE REFERENCES stokvels(id) ON DELETE CASCADE,
    is_public       BOOLEAN NOT NULL DEFAULT false,
    location        VARCHAR(255),
    latitude        NUMERIC(10,7),
    longitude       NUMERIC(10,7),
    tags            TEXT[],
    avg_return_pct  NUMERIC(5,2),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE join_requests (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id  UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(stokvel_id, user_id)
);
""",
),

(
"migrations/009_investments.sql",
"""-- Investment stokvels
CREATE TYPE fund_type AS ENUM ('money_market', 'equity', 'bond', 'balanced');

CREATE TABLE investment_funds (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    type            fund_type NOT NULL,
    avg_return_pct  NUMERIC(5,2) NOT NULL,
    min_amount      NUMERIC(12,2) NOT NULL,
    risk_level      VARCHAR(20) NOT NULL,  -- low | medium | high
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE investment_positions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stokvel_id      UUID NOT NULL REFERENCES stokvels(id) ON DELETE CASCADE,
    fund_id         UUID NOT NULL REFERENCES investment_funds(id),
    amount_invested NUMERIC(12,2) NOT NULL DEFAULT 0,
    current_value   NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tax_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    tax_year        INTEGER NOT NULL,
    interest_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
    exemption_limit NUMERIC(12,2) NOT NULL DEFAULT 23800,
    report_url      TEXT,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, tax_year)
);
""",
),

(
"migrations/010_fraud_security.sql",
"""-- Fraud Shield & security
CREATE TABLE fraud_settings (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    behavioral_analytics    BOOLEAN NOT NULL DEFAULT false,
    sim_swap_detection      BOOLEAN NOT NULL DEFAULT false,
    jailbreak_detection     BOOLEAN NOT NULL DEFAULT false,
    geofencing              BOOLEAN NOT NULL DEFAULT false,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fraud_alerts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,  -- sim_swap | geo_anomaly | behavior | jailbreak
    severity    VARCHAR(20) NOT NULL,  -- low | medium | high | critical
    detail      JSONB NOT NULL,
    resolved    BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE feature_lock_settings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    lock_withdrawals    BOOLEAN NOT NULL DEFAULT false,
    lock_payments       BOOLEAN NOT NULL DEFAULT false,
    lock_statements     BOOLEAN NOT NULL DEFAULT false,
    lock_linked_accounts BOOLEAN NOT NULL DEFAULT false,
    lock_investments    BOOLEAN NOT NULL DEFAULT false,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       TEXT NOT NULL,
    ip_address      INET,
    user_agent      TEXT,
    last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
""",
),

# ── src/ ──────────────────────────────────────────────────────────────────────

(
"src/main.rs",
"""use axum::Router;
use dotenvy::dotenv;
use std::net::SocketAddr;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod errors;
mod extractors;
mod middleware;
mod models;
mod handlers;
mod routes;
mod services;
mod repositories;
mod payments;
mod notifications;
mod jobs;
mod utils;

use config::Config;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Config::from_env()?;
    let db = db::connect(&config.database_url).await?;
    let redis = db::connect_redis(&config.redis_url).await?;
    let payment_provider = payments::build_provider(&config)?;

    let state = routes::AppState {
        db,
        redis,
        config: config.clone(),
        payment_provider,
    };

    let app = Router::new()
        .merge(routes::auth::router())
        .merge(routes::users::router())
        .merge(routes::stokvels::router())
        .merge(routes::contributions::router())
        .merge(routes::wallet::router())
        .merge(routes::market::router())
        .merge(routes::discover::router())
        .merge(routes::fair_score::router())
        .merge(routes::investments::router())
        .merge(routes::messages::router())
        .merge(routes::notifications::router())
        .merge(routes::fraud::router())
        .merge(routes::webhooks::router())
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr: SocketAddr = format!("{}:{}", config.app_host, config.app_port).parse()?;
    tracing::info!("motherlode listening on {}", addr);

    axum::serve(tokio::net::TcpListener::bind(addr).await?, app).await?;
    Ok(())
}
""",
),

(
"src/config.rs",
"""use anyhow::Result;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_hours: i64,
    pub refresh_token_expiry_days: i64,
    pub app_env: String,
    pub app_port: u16,
    pub app_host: String,
    pub payment_provider: String,
    pub ukheshe_base_url: String,
    pub ukheshe_client_id: String,
    pub ukheshe_client_secret: String,
    pub ukheshe_webhook_secret: String,
    pub internal_payments_enabled: bool,
    pub kyc_provider_url: String,
    pub kyc_api_key: String,
    pub sim_swap_api_url: String,
    pub sim_swap_api_key: String,
    pub fcm_server_key: String,
    pub sendgrid_api_key: String,
    pub whatsapp_api_url: String,
    pub whatsapp_token: String,
    pub tax_free_interest_limit: f64,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")?,
            redis_url: std::env::var("REDIS_URL")?,
            jwt_secret: std::env::var("JWT_SECRET")?,
            jwt_expiry_hours: std::env::var("JWT_EXPIRY_HOURS").unwrap_or("24".into()).parse()?,
            refresh_token_expiry_days: std::env::var("REFRESH_TOKEN_EXPIRY_DAYS").unwrap_or("30".into()).parse()?,
            app_env: std::env::var("APP_ENV").unwrap_or("development".into()),
            app_port: std::env::var("APP_PORT").unwrap_or("8080".into()).parse()?,
            app_host: std::env::var("APP_HOST").unwrap_or("0.0.0.0".into()),
            payment_provider: std::env::var("PAYMENT_PROVIDER").unwrap_or("ukheshe".into()),
            ukheshe_base_url: std::env::var("UKHESHE_BASE_URL").unwrap_or_default(),
            ukheshe_client_id: std::env::var("UKHESHE_CLIENT_ID").unwrap_or_default(),
            ukheshe_client_secret: std::env::var("UKHESHE_CLIENT_SECRET").unwrap_or_default(),
            ukheshe_webhook_secret: std::env::var("UKHESHE_WEBHOOK_SECRET").unwrap_or_default(),
            internal_payments_enabled: std::env::var("INTERNAL_PAYMENTS_ENABLED").unwrap_or("false".into()).parse()?,
            kyc_provider_url: std::env::var("KYC_PROVIDER_URL").unwrap_or_default(),
            kyc_api_key: std::env::var("KYC_API_KEY").unwrap_or_default(),
            sim_swap_api_url: std::env::var("SIM_SWAP_API_URL").unwrap_or_default(),
            sim_swap_api_key: std::env::var("SIM_SWAP_API_KEY").unwrap_or_default(),
            fcm_server_key: std::env::var("FCM_SERVER_KEY").unwrap_or_default(),
            sendgrid_api_key: std::env::var("SENDGRID_API_KEY").unwrap_or_default(),
            whatsapp_api_url: std::env::var("WHATSAPP_API_URL").unwrap_or_default(),
            whatsapp_token: std::env::var("WHATSAPP_TOKEN").unwrap_or_default(),
            tax_free_interest_limit: std::env::var("TAX_FREE_INTEREST_LIMIT").unwrap_or("23800".into()).parse()?,
        })
    }

    pub fn is_production(&self) -> bool {
        self.app_env == "production"
    }
}
""",
),

(
"src/errors.rs",
"""use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Payment error: {0}")]
    PaymentError(String),

    #[error("KYC required")]
    KycRequired,

    #[error("Insufficient funds")]
    InsufficientFunds,

    #[error("Multi-sig approval required")]
    MultiSigRequired,

    #[error("Fraud detected")]
    FraudDetected,

    #[error("Internal error")]
    Internal(#[from] anyhow::Error),

    #[error("Database error")]
    Database(#[from] sea_orm::DbErr),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(m)       => (StatusCode::NOT_FOUND, m.clone()),
            AppError::Unauthorized      => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            AppError::Forbidden         => (StatusCode::FORBIDDEN, "Forbidden".into()),
            AppError::BadRequest(m)     => (StatusCode::BAD_REQUEST, m.clone()),
            AppError::Conflict(m)       => (StatusCode::CONFLICT, m.clone()),
            AppError::PaymentError(m)   => (StatusCode::BAD_GATEWAY, m.clone()),
            AppError::KycRequired       => (StatusCode::FORBIDDEN, "KYC verification required".into()),
            AppError::InsufficientFunds => (StatusCode::UNPROCESSABLE_ENTITY, "Insufficient funds".into()),
            AppError::MultiSigRequired  => (StatusCode::FORBIDDEN, "Multi-sig approval required".into()),
            AppError::FraudDetected     => (StatusCode::FORBIDDEN, "Transaction blocked by Fraud Shield".into()),
            AppError::Internal(_)       => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".into()),
            AppError::Database(_)       => (StatusCode::INTERNAL_SERVER_ERROR, "Database error".into()),
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
""",
),

(
"src/db/mod.rs",
"""use sea_orm::{Database, DatabaseConnection};
use redis::{Client, aio::ConnectionManager};

pub async fn connect(url: &str) -> anyhow::Result<DatabaseConnection> {
    Ok(Database::connect(url).await?)
}

pub async fn connect_redis(url: &str) -> anyhow::Result<ConnectionManager> {
    let client = Client::open(url)?;
    Ok(ConnectionManager::new(client).await?)
}
""",
),

# ── Payments (trait + providers) ──────────────────────────────────────────────

(
"src/payments/mod.rs",
"""//! Payment provider abstraction.
//! Swap between Ukheshe and Internal by changing PAYMENT_PROVIDER env var.
//! When FSP license is obtained, set PAYMENT_PROVIDER=internal.

use async_trait::async_trait;
use rust_decimal::Decimal;
use uuid::Uuid;
use crate::config::Config;
use crate::errors::AppResult;

pub mod ukheshe;
pub mod internal;
pub mod types;

pub use types::*;

#[async_trait]
pub trait PaymentProvider: Send + Sync {
    /// Initiate a deposit into a user's wallet
    async fn deposit(&self, req: DepositRequest) -> AppResult<PaymentResponse>;

    /// Initiate a withdrawal from a user's wallet to their bank
    async fn withdraw(&self, req: WithdrawRequest) -> AppResult<PaymentResponse>;

    /// Transfer between two internal wallets
    async fn transfer(&self, req: TransferRequest) -> AppResult<PaymentResponse>;

    /// Check the status of a transaction
    async fn transaction_status(&self, provider_ref: &str) -> AppResult<TransactionStatus>;

    /// Verify a webhook payload signature
    fn verify_webhook(&self, payload: &[u8], signature: &str) -> AppResult<()>;

    /// Provider name for logging
    fn name(&self) -> &'static str;
}

/// Build the active payment provider from config
pub fn build_provider(config: &Config) -> anyhow::Result<std::sync::Arc<dyn PaymentProvider>> {
    match config.payment_provider.as_str() {
        "ukheshe" => {
            tracing::info!("Payment provider: Ukheshe");
            Ok(std::sync::Arc::new(ukheshe::UkhesheProvider::new(config)?))
        }
        "internal" => {
            tracing::info!("Payment provider: Internal (FSP)");
            Ok(std::sync::Arc::new(internal::InternalProvider::new(config)?))
        }
        other => anyhow::bail!("Unknown payment provider: {}", other),
    }
}
""",
),

(
"src/payments/types.rs",
"""use rust_decimal::Decimal;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct DepositRequest {
    pub user_id: Uuid,
    pub amount: Decimal,
    pub reference: String,
    pub phone: String,
}

#[derive(Debug, Clone)]
pub struct WithdrawRequest {
    pub user_id: Uuid,
    pub amount: Decimal,
    pub reference: String,
    pub bank_account_id: Uuid,
}

#[derive(Debug, Clone)]
pub struct TransferRequest {
    pub from_user_id: Uuid,
    pub to_user_id: Uuid,
    pub amount: Decimal,
    pub reference: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentResponse {
    pub provider_ref: String,
    pub status: TransactionStatus,
    pub message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
    Reversed,
}
""",
),

(
"src/payments/ukheshe.rs",
"""//! Ukheshe payment provider implementation.
//! Active until FSP license is obtained — then swap to internal.

use async_trait::async_trait;
use crate::{config::Config, errors::{AppError, AppResult}, payments::*};

pub struct UkhesheProvider {
    base_url: String,
    client_id: String,
    client_secret: String,
    webhook_secret: String,
    http: reqwest::Client,
}

impl UkhesheProvider {
    pub fn new(config: &Config) -> anyhow::Result<Self> {
        Ok(Self {
            base_url: config.ukheshe_base_url.clone(),
            client_id: config.ukheshe_client_id.clone(),
            client_secret: config.ukheshe_client_secret.clone(),
            webhook_secret: config.ukheshe_webhook_secret.clone(),
            http: reqwest::Client::new(),
        })
    }
}

#[async_trait]
impl PaymentProvider for UkhesheProvider {
    async fn deposit(&self, req: DepositRequest) -> AppResult<PaymentResponse> {
        // TODO: implement Ukheshe deposit API call
        todo!("Ukheshe deposit")
    }

    async fn withdraw(&self, req: WithdrawRequest) -> AppResult<PaymentResponse> {
        // TODO: implement Ukheshe withdrawal API call
        todo!("Ukheshe withdrawal")
    }

    async fn transfer(&self, req: TransferRequest) -> AppResult<PaymentResponse> {
        // TODO: implement Ukheshe transfer API call
        todo!("Ukheshe transfer")
    }

    async fn transaction_status(&self, provider_ref: &str) -> AppResult<TransactionStatus> {
        // TODO: implement Ukheshe status check
        todo!("Ukheshe status")
    }

    fn verify_webhook(&self, payload: &[u8], signature: &str) -> AppResult<()> {
        // TODO: HMAC verification against webhook_secret
        todo!("Ukheshe webhook verification")
    }

    fn name(&self) -> &'static str { "ukheshe" }
}
""",
),

(
"src/payments/internal.rs",
"""//! Internal payment provider — activated post-FSP license.
//! Replaces Ukheshe with direct bank rails.

use async_trait::async_trait;
use crate::{config::Config, errors::AppResult, payments::*};

pub struct InternalProvider {
    // TODO: add internal payment rail config fields
}

impl InternalProvider {
    pub fn new(config: &Config) -> anyhow::Result<Self> {
        if !config.internal_payments_enabled {
            anyhow::bail!("Internal payments not enabled. Set INTERNAL_PAYMENTS_ENABLED=true and ensure FSP license is active.");
        }
        Ok(Self {})
    }
}

#[async_trait]
impl PaymentProvider for InternalProvider {
    async fn deposit(&self, req: DepositRequest) -> AppResult<PaymentResponse> {
        todo!("Internal deposit — implement after FSP licensing")
    }

    async fn withdraw(&self, req: WithdrawRequest) -> AppResult<PaymentResponse> {
        todo!("Internal withdrawal — implement after FSP licensing")
    }

    async fn transfer(&self, req: TransferRequest) -> AppResult<PaymentResponse> {
        todo!("Internal transfer — implement after FSP licensing")
    }

    async fn transaction_status(&self, provider_ref: &str) -> AppResult<TransactionStatus> {
        todo!("Internal status — implement after FSP licensing")
    }

    fn verify_webhook(&self, payload: &[u8], signature: &str) -> AppResult<()> {
        todo!("Internal webhook — implement after FSP licensing")
    }

    fn name(&self) -> &'static str { "internal" }
}
""",
),

# ── Routes ────────────────────────────────────────────────────────────────────

(
"src/routes/mod.rs",
"""use std::sync::Arc;
use sea_orm::DatabaseConnection;
use redis::aio::ConnectionManager;
use crate::{config::Config, payments::PaymentProvider};

pub mod auth;
pub mod users;
pub mod stokvels;
pub mod contributions;
pub mod wallet;
pub mod market;
pub mod discover;
pub mod fair_score;
pub mod investments;
pub mod messages;
pub mod notifications;
pub mod fraud;
pub mod webhooks;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub redis: ConnectionManager,
    pub config: Config,
    pub payment_provider: Arc<dyn PaymentProvider>,
}
""",
),

# Generate stub route files
*[
(
f"src/routes/{name}.rs",
f"""use axum::Router;
use crate::routes::AppState;

pub fn router() -> Router<AppState> {{
    Router::new()
    // TODO: define {name} routes
}}
""",
)
for name in [
    "auth", "users", "stokvels", "contributions",
    "wallet", "market", "discover", "fair_score",
    "investments", "messages", "notifications", "fraud", "webhooks",
]
],

# ── Handlers ──────────────────────────────────────────────────────────────────

*[
(
f"src/handlers/{name}.rs",
f"// {name} handlers\n",
)
for name in [
    "auth", "users", "stokvels", "contributions",
    "wallet", "market", "discover", "fair_score",
    "investments", "messages", "notifications", "fraud", "webhooks",
]
],

(
"src/handlers/mod.rs",
"\n".join([
    f"pub mod {name};"
    for name in [
        "auth", "users", "stokvels", "contributions",
        "wallet", "market", "discover", "fair_score",
        "investments", "messages", "notifications", "fraud", "webhooks",
    ]
]) + "\n",
),

# ── Services ──────────────────────────────────────────────────────────────────

*[
(
f"src/services/{name}.rs",
f"// {name} service\n",
)
for name in [
    "auth", "users", "stokvels", "contributions",
    "wallet", "market", "discover", "fair_score",
    "investments", "messages", "notifications",
    "fraud", "kyc", "sim_swap", "tax",
]
],

(
"src/services/mod.rs",
"\n".join([
    f"pub mod {name};"
    for name in [
        "auth", "users", "stokvels", "contributions",
        "wallet", "market", "discover", "fair_score",
        "investments", "messages", "notifications",
        "fraud", "kyc", "sim_swap", "tax",
    ]
]) + "\n",
),

# ── Repositories ──────────────────────────────────────────────────────────────

*[
(
f"src/repositories/{name}.rs",
f"// {name} repository\n",
)
for name in [
    "users", "stokvels", "contributions", "wallet",
    "market", "fair_score", "investments", "messages",
    "notifications", "fraud",
]
],

(
"src/repositories/mod.rs",
"\n".join([
    f"pub mod {name};"
    for name in [
        "users", "stokvels", "contributions", "wallet",
        "market", "fair_score", "investments", "messages",
        "notifications", "fraud",
    ]
]) + "\n",
),

# ── Models ────────────────────────────────────────────────────────────────────

*[
(
f"src/models/{name}.rs",
f"// {name} model\n",
)
for name in [
    "user", "stokvel", "contribution", "wallet",
    "market", "fair_score", "investment", "message",
    "notification", "fraud",
]
],

(
"src/models/mod.rs",
"\n".join([
    f"pub mod {name};"
    for name in [
        "user", "stokvel", "contribution", "wallet",
        "market", "fair_score", "investment", "message",
        "notification", "fraud",
    ]
]) + "\n",
),

# ── Middleware ─────────────────────────────────────────────────────────────────

(
"src/middleware/mod.rs",
"pub mod auth;\npub mod fraud;\npub mod rate_limit;\npub mod feature_lock;\n",
),
(
"src/middleware/auth.rs",
"// JWT extraction & validation middleware\n",
),
(
"src/middleware/fraud.rs",
"// Fraud Shield middleware — behavioral analytics, geofencing\n",
),
(
"src/middleware/rate_limit.rs",
"// Rate limiting middleware via Redis\n",
),
(
"src/middleware/feature_lock.rs",
"// PIN enforcement for locked features\n",
),

# ── Extractors ────────────────────────────────────────────────────────────────

(
"src/extractors/mod.rs",
"pub mod auth_user;\n",
),
(
"src/extractors/auth_user.rs",
"// Axum extractor for authenticated user from JWT\n",
),

# ── Notifications ─────────────────────────────────────────────────────────────

(
"src/notifications/mod.rs",
"pub mod fcm;\npub mod whatsapp;\npub mod email;\n",
),
(
"src/notifications/fcm.rs",
"// Firebase Cloud Messaging — push notifications\n",
),
(
"src/notifications/whatsapp.rs",
"// WhatsApp notification delivery\n",
),
(
"src/notifications/email.rs",
"// Email delivery via SendGrid\n",
),

# ── Background jobs ────────────────────────────────────────────────────────────

(
"src/jobs/mod.rs",
"pub mod contribution_reminders;\npub mod payout_processor;\npub mod fair_score_updater;\npub mod market_sync;\npub mod sim_swap_checker;\n",
),
(
"src/jobs/contribution_reminders.rs",
"// Scheduled job: remind members of upcoming contributions\n",
),
(
"src/jobs/payout_processor.rs",
"// Scheduled job: process due payouts\n",
),
(
"src/jobs/fair_score_updater.rs",
"// Scheduled job: recalculate Fair Scores monthly\n",
),
(
"src/jobs/market_sync.rs",
"// Scheduled job: sync retailer product deals\n",
),
(
"src/jobs/sim_swap_checker.rs",
"// Scheduled job: check for SIM swap signals on active users\n",
),

# ── Utils ──────────────────────────────────────────────────────────────────────

(
"src/utils/mod.rs",
"pub mod jwt;\npub mod hashing;\npub mod codes;\npub mod pagination;\npub mod i18n;\n",
),
(
"src/utils/jwt.rs",
"// JWT generation and validation\n",
),
(
"src/utils/hashing.rs",
"// Argon2 password/PIN hashing\n",
),
(
"src/utils/codes.rs",
"// Unique code generation (collection codes, OTPs)\n",
),
(
"src/utils/pagination.rs",
"// Pagination helpers for list endpoints\n",
),
(
"src/utils/i18n.rs",
"// Internationalisation — EN, Tsonga, Sotho, Zulu\n",
),

]  # end FILES


def scaffold():
    for path, content in FILES:
        full_path = os.path.join(ROOT, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w") as f:
            f.write(content)

    print(f"\n✅  motherlode scaffolded successfully.\n")
    print("Next steps:")
    print("  cd motherlode")
    print("  cp .env.example .env   # fill in your values")
    print("  cargo build            # verify it compiles")
    print("  sqlx migrate run       # run migrations")
    print("  cargo run\n")


if __name__ == "__main__":
    scaffold()
