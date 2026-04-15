use blinc_app::prelude::*;
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
