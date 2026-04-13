//! Route aggregator — wires all domain routers into the main app.
//!
//! Pattern: each domain router receives the AppState at construction time
//! so middleware layers (like JWT injection) have access to config.

use std::sync::Arc;
use sea_orm::DatabaseConnection;
use redis::aio::ConnectionManager;

use crate::{config::Config, payments::PaymentProvider};

pub mod auth;
pub mod contributions;
pub mod discover;
pub mod fair_score;
pub mod fraud;
pub mod investments;
pub mod market;
pub mod messages;
pub mod notifications;
pub mod stokvels;
pub mod users;
pub mod wallet;
pub mod webhooks;

// ── App State ─────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub redis: ConnectionManager,
    pub config: Config,
    pub payment_provider: Arc<dyn PaymentProvider>,
}

// ── Main router builder ───────────────────────────────────────────────────────
// Called from main.rs — assembles every domain router.

use axum::Router;

pub fn build_router(state: AppState) -> Router {
    Router::new()
        // Auth — pass state clone so middleware can inject JWT secret
        .merge(auth::router(state.clone()))
        // All other domain routers (stateless — state injected via with_state)
        .merge(stokvels::router())
        .merge(contributions::router())
        .merge(wallet::router())
        .merge(market::router())
        .merge(discover::router())
        .merge(fair_score::router())
        .merge(investments::router())
        .merge(messages::router())
        .merge(notifications::router())
        .merge(fraud::router())
        .merge(webhooks::router())
        .with_state(state)
}
