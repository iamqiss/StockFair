use axum::Router;
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
        .merge(routes::auth::router(state.clone()))
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
