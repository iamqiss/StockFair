#!/usr/bin/env python3
"""
bigfinance — chipin's DeFi + Multi-currency Engine

Every transaction in chipin passes through bigfinance BEFORE
motherlode touches a database. This is the money brain.

Responsibilities:
  - Currency conversion (local ↔ USDC ↔ local)
  - DeFi yield calculation on pool balances
  - Fee extraction (platform cut, partner cut, gas abstraction)
  - USDC settlement layer
  - Revenue accounting (every cut tracked)
  - Pool rebalancing decisions
  - Yield distribution per member

Architecture:
  speedcrime
      ↓ gRPC
  motherlode  →  bigfinance  →  DeFi protocol / USDC rails
                    ↓
              motherlode (settlement confirmed, write to DB)

Run from: StockFair/
"""

import os

ROOT = "bigfinance"

FILES = [

# ── Cargo.toml ────────────────────────────────────────────────────────────────

(
"Cargo.toml",
"""[package]
name        = "bigfinance"
version     = "0.1.0"
edition     = "2021"
description = "chipin DeFi yield + multi-currency + fee engine"

[lib]
name = "bigfinance"
path = "src/lib.rs"

[[bin]]
name = "bigfinance"
path = "src/main.rs"

[dependencies]
# Async
tokio        = { version = "1", features = ["full"] }

# gRPC — talks to motherlode and DeFi protocols
tonic        = { version = "0.12", features = ["transport"] }
prost        = "0.13"
prost-types  = "0.13"

# Decimal arithmetic — NEVER use f64 for money
rust_decimal = { version = "1", features = ["serde-with-str", "maths"] }
rust_decimal_macros = "1"

# Serialization
serde        = { version = "1", features = ["derive"] }
serde_json   = "1"

# HTTP client — price feeds, DeFi APIs
reqwest      = { version = "0.11", features = ["json", "rustls-tls"] }

# Error handling
anyhow       = "1"
thiserror    = "1"

# Logging
tracing      = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# Date / time
chrono       = { version = "0.4", features = ["serde"] }

# Config
dotenvy      = "0.15"

# Cache (rate feeds cached here, not in motherlode)
redis        = { version = "0.25", features = ["tokio-comp", "connection-manager"] }

# UUID
uuid         = { version = "1", features = ["v4", "serde"] }

[build-dependencies]
tonic-build  = "0.12"
prost-build  = "0.13"

[dev-dependencies]
tokio-test   = "0.4"
""",
),

# ── .env.example ──────────────────────────────────────────────────────────────

(
".env.example",
"""# ── Server ───────────────────────────────────────────────────────────────────
BIGFINANCE_HOST=0.0.0.0
BIGFINANCE_PORT=60051   # gRPC port — motherlode calls bigfinance here

# ── Redis (rate cache) ────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Currency oracle ───────────────────────────────────────────────────────────
# Primary: Chainlink price feeds (on-chain, tamper-proof)
# Fallback: CoinGecko REST API
CHAINLINK_RPC_URL=https://polygon-rpc.com
COINGECKO_API_KEY=

# How often to refresh rates (seconds)
RATE_REFRESH_INTERVAL=60

# ── USDC Settlement ───────────────────────────────────────────────────────────
# Polygon for low gas fees
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
SETTLEMENT_NETWORK=polygon

# Wallet that holds pool USDC (custodial for now, non-custodial future)
SETTLEMENT_WALLET_ADDRESS=
SETTLEMENT_WALLET_KEY=     # keep out of git — use secrets manager in prod

# ── DeFi Yield ────────────────────────────────────────────────────────────────
# Aave v3 on Polygon for USDC yield
AAVE_POOL_ADDRESS=0x794a61358D6845594F94dc1DB02A252b5b4814aD
AAVE_DATA_PROVIDER=0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654

# Target minimum yield APY before we consider switching protocols
MINIMUM_YIELD_APY_PCT=3.5

# ── Fee Structure ─────────────────────────────────────────────────────────────
# All in basis points (bps). 100 bps = 1%

# Platform fee on contributions
PLATFORM_FEE_BPS=50         # 0.5% on every contribution

# Yield performance fee (chipin takes a cut of the yield earned)
YIELD_PERFORMANCE_FEE_BPS=1000  # 10% of yield generated

# Withdrawal fee
WITHDRAWAL_FEE_BPS=25       # 0.25% on withdrawals

# FX conversion spread (chipin's cut on currency conversion)
FX_SPREAD_BPS=30            # 0.3% on every conversion

# Partner referral cut (paid to retail partners like Shoprite)
PARTNER_CUT_BPS=100         # 1% of bulk order value to partner

# ── App Config ────────────────────────────────────────────────────────────────
APP_ENV=development
""",
),

# ── .gitignore ────────────────────────────────────────────────────────────────

(
".gitignore",
"""target/
.env
*.log
""",
),

# ── src/lib.rs ────────────────────────────────────────────────────────────────

(
"src/lib.rs",
"""//! bigfinance — chipin's DeFi + multi-currency engine.
//!
//! Every financial operation in chipin flows through here before
//! motherlode commits anything to the database.
//!
//! # Flow
//! ```text
//! User action (contribute R500)
//!     ↓
//! motherlode receives request
//!     ↓
//! bigfinance::pipeline::process(contribution)
//!     ↓ converts ZAR → USDC at live rate
//!     ↓ deducts platform fee (0.5%)
//!     ↓ routes net amount to yield protocol (Aave)
//!     ↓ records revenue split
//!     ↓ returns settlement confirmation
//!     ↓
//! motherlode writes confirmed transaction to DB
//! ```

pub mod config;
pub mod currency;
pub mod defi;
pub mod fees;
pub mod pipeline;
pub mod revenue;
pub mod settlement;
pub mod oracle;
pub mod proto;
pub mod server;
""",
),

# ── src/main.rs ───────────────────────────────────────────────────────────────

(
"src/main.rs",
"""use bigfinance::{config::Config, server};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_max_level(tracing::Level::INFO)
        .init();

    let config = Config::from_env()?;

    tracing::info!(
        "bigfinance starting on {}:{}",
        config.host, config.port
    );

    server::run(config).await
}
""",
),

# ── src/config.rs ─────────────────────────────────────────────────────────────

(
"src/config.rs",
"""//! Configuration — loaded from environment variables.

use rust_decimal::Decimal;
use anyhow::Result;

#[derive(Debug, Clone)]
pub struct Config {
    // Server
    pub host: String,
    pub port: u16,
    pub app_env: String,

    // Redis
    pub redis_url: String,

    // Oracle
    pub chainlink_rpc_url:    String,
    pub coingecko_api_key:    String,
    pub rate_refresh_interval: u64,

    // USDC
    pub usdc_contract_address:    String,
    pub settlement_network:       String,
    pub settlement_wallet_address: String,
    pub settlement_wallet_key:    String,

    // DeFi
    pub aave_pool_address:      String,
    pub aave_data_provider:     String,
    pub minimum_yield_apy_pct:  Decimal,

    // Fees (basis points)
    pub platform_fee_bps:          u32,
    pub yield_performance_fee_bps: u32,
    pub withdrawal_fee_bps:        u32,
    pub fx_spread_bps:             u32,
    pub partner_cut_bps:           u32,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            host:     std::env::var("BIGFINANCE_HOST").unwrap_or("0.0.0.0".into()),
            port:     std::env::var("BIGFINANCE_PORT").unwrap_or("60051".into()).parse()?,
            app_env:  std::env::var("APP_ENV").unwrap_or("development".into()),
            redis_url: std::env::var("REDIS_URL")?,
            chainlink_rpc_url:    std::env::var("CHAINLINK_RPC_URL").unwrap_or_default(),
            coingecko_api_key:    std::env::var("COINGECKO_API_KEY").unwrap_or_default(),
            rate_refresh_interval: std::env::var("RATE_REFRESH_INTERVAL").unwrap_or("60".into()).parse()?,
            usdc_contract_address:    std::env::var("USDC_CONTRACT_ADDRESS").unwrap_or_default(),
            settlement_network:       std::env::var("SETTLEMENT_NETWORK").unwrap_or("polygon".into()),
            settlement_wallet_address: std::env::var("SETTLEMENT_WALLET_ADDRESS").unwrap_or_default(),
            settlement_wallet_key:    std::env::var("SETTLEMENT_WALLET_KEY").unwrap_or_default(),
            aave_pool_address:    std::env::var("AAVE_POOL_ADDRESS").unwrap_or_default(),
            aave_data_provider:   std::env::var("AAVE_DATA_PROVIDER").unwrap_or_default(),
            minimum_yield_apy_pct: std::env::var("MINIMUM_YIELD_APY_PCT")
                .unwrap_or("3.5".into()).parse()?,
            platform_fee_bps:          std::env::var("PLATFORM_FEE_BPS").unwrap_or("50".into()).parse()?,
            yield_performance_fee_bps: std::env::var("YIELD_PERFORMANCE_FEE_BPS").unwrap_or("1000".into()).parse()?,
            withdrawal_fee_bps:        std::env::var("WITHDRAWAL_FEE_BPS").unwrap_or("25".into()).parse()?,
            fx_spread_bps:             std::env::var("FX_SPREAD_BPS").unwrap_or("30".into()).parse()?,
            partner_cut_bps:           std::env::var("PARTNER_CUT_BPS").unwrap_or("100".into()).parse()?,
        })
    }

    pub fn is_production(&self) -> bool {
        self.app_env == "production"
    }

    /// Convert basis points to a decimal multiplier.
    /// e.g. 50 bps → 0.005
    pub fn bps_to_decimal(bps: u32) -> Decimal {
        Decimal::new(bps as i64, 4)
    }
}
""",
),

# ── src/currency/mod.rs ───────────────────────────────────────────────────────

(
"src/currency/mod.rs",
"""//! Multi-currency support.
//!
//! chipin's internal settlement currency is USDC.
//! Users always see and interact in their local currency.
//! All conversions happen here, invisibly.

pub mod currencies;
pub mod converter;
pub mod rates;

pub use currencies::{Currency, SupportedCurrency};
pub use converter::CurrencyConverter;
pub use rates::RateCache;
""",
),

(
"src/currency/currencies.rs",
"""//! All currencies chipin supports.
//!
//! USDC is the internal settlement layer — users never see it.
//! Add new currencies here to expand to new markets.

use serde::{Deserialize, Serialize};

/// Every currency chipin knows about.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "uppercase")]
pub enum SupportedCurrency {
    // ── Internal settlement ───────────────────────────────────────────────
    USDC,  // always the base — users never see this

    // ── Africa ────────────────────────────────────────────────────────────
    ZAR,   // South Africa — launch market
    NGN,   // Nigeria
    KES,   // Kenya
    GHS,   // Ghana
    TZS,   // Tanzania
    UGX,   // Uganda
    ZMW,   // Zambia
    MWK,   // Malawi
    BWP,   // Botswana
    NAD,   // Namibia

    // ── Asia ──────────────────────────────────────────────────────────────
    INR,   // India (chit funds)
    PHP,   // Philippines
    IDR,   // Indonesia
    VND,   // Vietnam
    BDT,   // Bangladesh

    // ── Latin America ─────────────────────────────────────────────────────
    MXN,   // Mexico (tandas)
    BRL,   // Brazil
    COP,   // Colombia
    PEN,   // Peru
    CLP,   // Chile

    // ── Middle East / North Africa ────────────────────────────────────────
    EGP,   // Egypt (gameya)
    MAD,   // Morocco
    TND,   // Tunisia

    // ── Global fallback ───────────────────────────────────────────────────
    USD,   // United States
    EUR,   // Europe
    GBP,   // United Kingdom
}

impl SupportedCurrency {
    pub fn code(&self) -> &'static str {
        match self {
            Self::USDC => "USDC",
            Self::ZAR  => "ZAR",
            Self::NGN  => "NGN",
            Self::KES  => "KES",
            Self::GHS  => "GHS",
            Self::TZS  => "TZS",
            Self::UGX  => "UGX",
            Self::ZMW  => "ZMW",
            Self::MWK  => "MWK",
            Self::BWP  => "BWP",
            Self::NAD  => "NAD",
            Self::INR  => "INR",
            Self::PHP  => "PHP",
            Self::IDR  => "IDR",
            Self::VND  => "VND",
            Self::BDT  => "BDT",
            Self::MXN  => "MXN",
            Self::BRL  => "BRL",
            Self::COP  => "COP",
            Self::PEN  => "PEN",
            Self::CLP  => "CLP",
            Self::EGP  => "EGP",
            Self::MAD  => "MAD",
            Self::TND  => "TND",
            Self::USD  => "USD",
            Self::EUR  => "EUR",
            Self::GBP  => "GBP",
        }
    }

    pub fn symbol(&self) -> &'static str {
        match self {
            Self::USDC => "$",
            Self::ZAR  => "R",
            Self::NGN  => "₦",
            Self::KES  => "KSh",
            Self::GHS  => "GH₵",
            Self::TZS  => "TSh",
            Self::UGX  => "USh",
            Self::ZMW  => "ZK",
            Self::MWK  => "MK",
            Self::BWP  => "P",
            Self::NAD  => "N$",
            Self::INR  => "₹",
            Self::PHP  => "₱",
            Self::IDR  => "Rp",
            Self::VND  => "₫",
            Self::BDT  => "৳",
            Self::MXN  => "MX$",
            Self::BRL  => "R$",
            Self::COP  => "COL$",
            Self::PEN  => "S/",
            Self::CLP  => "CL$",
            Self::EGP  => "£",
            Self::MAD  => "MAD",
            Self::TND  => "DT",
            Self::USD  => "$",
            Self::EUR  => "€",
            Self::GBP  => "£",
        }
    }

    /// Decimal places used for display.
    pub fn decimals(&self) -> u32 {
        match self {
            Self::VND | Self::IDR | Self::UGX | Self::TZS => 0,
            _ => 2,
        }
    }

    /// Format an amount in this currency for display.
    /// Users always see local currency — USDC is hidden.
    pub fn format(&self, amount: rust_decimal::Decimal) -> String {
        let decimals = self.decimals();
        let rounded  = amount.round_dp(decimals);
        format!("{}{}", self.symbol(), rounded)
    }

    pub fn from_code(code: &str) -> Option<Self> {
        match code.to_uppercase().as_str() {
            "USDC" => Some(Self::USDC),
            "ZAR"  => Some(Self::ZAR),
            "NGN"  => Some(Self::NGN),
            "KES"  => Some(Self::KES),
            "GHS"  => Some(Self::GHS),
            "INR"  => Some(Self::INR),
            "MXN"  => Some(Self::MXN),
            "EGP"  => Some(Self::EGP),
            "USD"  => Some(Self::USD),
            "EUR"  => Some(Self::EUR),
            "GBP"  => Some(Self::GBP),
            _ => None,
        }
    }
}

/// A money value with its currency.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Currency {
    pub amount:   rust_decimal::Decimal,
    pub currency: SupportedCurrency,
}

impl Currency {
    pub fn new(amount: rust_decimal::Decimal, currency: SupportedCurrency) -> Self {
        Self { amount, currency }
    }

    pub fn zar(amount: rust_decimal::Decimal) -> Self {
        Self::new(amount, SupportedCurrency::ZAR)
    }

    pub fn usdc(amount: rust_decimal::Decimal) -> Self {
        Self::new(amount, SupportedCurrency::USDC)
    }

    pub fn format(&self) -> String {
        self.currency.format(self.amount)
    }
}
""",
),

(
"src/currency/rates.rs",
"""//! Exchange rate cache — rates fetched from oracle, cached in Redis.
//!
//! All rates are expressed as: 1 USDC = X local currency
//! e.g. ZAR rate = 18.5 means 1 USDC = R18.50

use std::collections::HashMap;
use redis::aio::ConnectionManager;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::currency::currencies::SupportedCurrency;

const RATE_KEY_PREFIX: &str = "bigfinance:rate:";
const RATE_TTL_SECONDS: u64 = 120; // 2 minutes max staleness

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExchangeRate {
    /// 1 USDC = this many units of the target currency
    pub usdc_to_local: Decimal,
    /// 1 unit of local = this many USDC
    pub local_to_usdc: Decimal,
    pub currency:      SupportedCurrency,
    pub fetched_at:    DateTime<Utc>,
    pub source:        RateSource,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RateSource {
    Chainlink,  // on-chain oracle — preferred
    CoinGecko,  // REST API fallback
    Hardcoded,  // dev/testing only — never in production
}

pub struct RateCache {
    redis: ConnectionManager,
}

impl RateCache {
    pub fn new(redis: ConnectionManager) -> Self {
        Self { redis }
    }

    /// Get cached rate for a currency pair. Returns None if stale or missing.
    pub async fn get(&mut self, currency: &SupportedCurrency) -> Option<ExchangeRate> {
        let key = format!("{}{}", RATE_KEY_PREFIX, currency.code());
        let raw: Option<String> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut self.redis)
            .await
            .ok()?;

        raw.and_then(|s| serde_json::from_str(&s).ok())
    }

    /// Store a fresh rate in Redis.
    pub async fn set(&mut self, rate: &ExchangeRate) -> anyhow::Result<()> {
        let key = format!("{}{}", RATE_KEY_PREFIX, rate.currency.code());
        let value = serde_json::to_string(rate)?;
        redis::cmd("SETEX")
            .arg(&key)
            .arg(RATE_TTL_SECONDS)
            .arg(value)
            .query_async::<_, ()>(&mut self.redis)
            .await?;
        Ok(())
    }

    /// Store multiple rates atomically.
    pub async fn set_many(&mut self, rates: &[ExchangeRate]) -> anyhow::Result<()> {
        for rate in rates {
            self.set(rate).await?;
        }
        Ok(())
    }

    /// Get all cached rates as a map.
    pub async fn get_all(&mut self) -> HashMap<String, ExchangeRate> {
        let mut map = HashMap::new();
        for currency in all_supported_currencies() {
            if let Some(rate) = self.get(&currency).await {
                map.insert(currency.code().to_string(), rate);
            }
        }
        map
    }
}

fn all_supported_currencies() -> Vec<SupportedCurrency> {
    vec![
        SupportedCurrency::ZAR, SupportedCurrency::NGN, SupportedCurrency::KES,
        SupportedCurrency::GHS, SupportedCurrency::INR, SupportedCurrency::PHP,
        SupportedCurrency::MXN, SupportedCurrency::BRL, SupportedCurrency::EGP,
        SupportedCurrency::USD, SupportedCurrency::EUR, SupportedCurrency::GBP,
    ]
}
""",
),

(
"src/currency/converter.rs",
"""//! Currency conversion engine.
//!
//! chipin's conversion flow:
//!   local → USDC (settlement)
//!   USDC → local (payout)
//!
//! The FX spread (chipin's cut) is applied on every conversion.
//! Users see the net amount — the spread is invisible to them
//! but fully accounted for in revenue.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::currency::{
    currencies::{Currency, SupportedCurrency},
    rates::{ExchangeRate, RateCache, RateSource},
};
use crate::fees::FeeResult;
use crate::config::Config;

pub struct CurrencyConverter {
    pub rate_cache: RateCache,
    pub config:     Config,
}

/// Result of a currency conversion.
#[derive(Debug, Clone)]
pub struct ConversionResult {
    /// What the user started with
    pub input:           Currency,
    /// What they end up with (after spread)
    pub output:          Currency,
    /// The rate used
    pub rate:            Decimal,
    /// chipin's FX spread revenue
    pub spread_revenue:  Currency,
    /// Whether rate was live or cached
    pub rate_source:     RateSource,
}

impl CurrencyConverter {
    pub fn new(rate_cache: RateCache, config: Config) -> Self {
        Self { rate_cache, config }
    }

    /// Convert local currency to USDC for settlement.
    /// Applies FX spread — chipin keeps the spread as revenue.
    pub async fn local_to_usdc(
        &mut self,
        amount: Decimal,
        from: SupportedCurrency,
    ) -> anyhow::Result<ConversionResult> {
        if from == SupportedCurrency::USDC {
            return Ok(ConversionResult {
                input:          Currency::usdc(amount),
                output:         Currency::usdc(amount),
                rate:           dec!(1),
                spread_revenue: Currency::usdc(dec!(0)),
                rate_source:    RateSource::Hardcoded,
            });
        }

        let rate = self.get_rate(&from).await?;
        let spread = Config::bps_to_decimal(self.config.fx_spread_bps);

        // Gross USDC before spread
        let gross_usdc = amount / rate.usdc_to_local;

        // Spread revenue stays with chipin
        let spread_amount = gross_usdc * spread;

        // Net USDC user gets
        let net_usdc = gross_usdc - spread_amount;

        Ok(ConversionResult {
            input:          Currency::new(amount, from),
            output:         Currency::usdc(net_usdc),
            rate:           rate.usdc_to_local,
            spread_revenue: Currency::usdc(spread_amount),
            rate_source:    rate.source,
        })
    }

    /// Convert USDC to local currency for payout.
    /// Also applies FX spread on the way out.
    pub async fn usdc_to_local(
        &mut self,
        usdc_amount: Decimal,
        to: SupportedCurrency,
    ) -> anyhow::Result<ConversionResult> {
        if to == SupportedCurrency::USDC {
            return Ok(ConversionResult {
                input:          Currency::usdc(usdc_amount),
                output:         Currency::usdc(usdc_amount),
                rate:           dec!(1),
                spread_revenue: Currency::usdc(dec!(0)),
                rate_source:    RateSource::Hardcoded,
            });
        }

        let rate = self.get_rate(&to).await?;
        let spread = Config::bps_to_decimal(self.config.fx_spread_bps);

        // Gross local before spread
        let gross_local = usdc_amount * rate.usdc_to_local;

        // Spread stays with chipin (deducted from gross)
        let spread_usdc  = usdc_amount * spread;
        let spread_local = spread_usdc * rate.usdc_to_local;

        // Net local user receives
        let net_local = gross_local - spread_local;

        Ok(ConversionResult {
            input:          Currency::usdc(usdc_amount),
            output:         Currency::new(net_local, to),
            rate:           rate.usdc_to_local,
            spread_revenue: Currency::usdc(spread_usdc),
            rate_source:    rate.source,
        })
    }

    /// Get exchange rate — cache first, oracle fallback.
    async fn get_rate(&mut self, currency: &SupportedCurrency) -> anyhow::Result<ExchangeRate> {
        // Try cache first
        if let Some(cached) = self.rate_cache.get(currency).await {
            return Ok(cached);
        }

        // Cache miss — fetch from oracle
        let rate = crate::oracle::fetch_rate(currency, &self.config).await?;
        self.rate_cache.set(&rate).await.ok(); // non-critical if cache fails
        Ok(rate)
    }
}
""",
),

# ── src/oracle/mod.rs ─────────────────────────────────────────────────────────

(
"src/oracle/mod.rs",
"""//! Price oracle — fetches live USDC/local exchange rates.
//!
//! Primary:  Chainlink on-chain price feeds (tamper-proof)
//! Fallback: CoinGecko REST API
//! Dev:      Hardcoded rates (never in production)

pub mod chainlink;
pub mod coingecko;

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::currency::currencies::SupportedCurrency;
use crate::currency::rates::{ExchangeRate, RateSource};
use crate::config::Config;
use chrono::Utc;

/// Fetch a live rate for a currency.
/// Tries Chainlink first, falls back to CoinGecko, then hardcoded dev rates.
pub async fn fetch_rate(
    currency: &SupportedCurrency,
    config: &Config,
) -> anyhow::Result<ExchangeRate> {
    // Try Chainlink (production)
    if !config.chainlink_rpc_url.is_empty() && config.is_production() {
        if let Ok(rate) = chainlink::fetch(currency, config).await {
            return Ok(rate);
        }
        tracing::warn!(
            currency = %currency.code(),
            "Chainlink fetch failed, falling back to CoinGecko"
        );
    }

    // Try CoinGecko (dev + Chainlink fallback)
    if !config.coingecko_api_key.is_empty() {
        if let Ok(rate) = coingecko::fetch(currency, config).await {
            return Ok(rate);
        }
        tracing::warn!(
            currency = %currency.code(),
            "CoinGecko fetch failed, using hardcoded dev rates"
        );
    }

    // Hardcoded dev rates — NEVER used in production
    if config.is_production() {
        anyhow::bail!(
            "All oracle sources failed for {} in production",
            currency.code()
        );
    }

    Ok(dev_rate(currency))
}

/// Hardcoded development rates — approximate, not for production.
fn dev_rate(currency: &SupportedCurrency) -> ExchangeRate {
    let usdc_to_local = match currency {
        SupportedCurrency::ZAR => dec!(18.50),
        SupportedCurrency::NGN => dec!(1650.0),
        SupportedCurrency::KES => dec!(130.0),
        SupportedCurrency::GHS => dec!(15.50),
        SupportedCurrency::INR => dec!(83.50),
        SupportedCurrency::PHP => dec!(56.50),
        SupportedCurrency::MXN => dec!(17.20),
        SupportedCurrency::BRL => dec!(5.05),
        SupportedCurrency::EGP => dec!(48.50),
        SupportedCurrency::USD => dec!(1.0),
        SupportedCurrency::EUR => dec!(0.92),
        SupportedCurrency::GBP => dec!(0.79),
        _                      => dec!(1.0),
    };

    let local_to_usdc = dec!(1) / usdc_to_local;

    ExchangeRate {
        usdc_to_local,
        local_to_usdc,
        currency:   currency.clone(),
        fetched_at: Utc::now(),
        source:     RateSource::Hardcoded,
    }
}
""",
),

(
"src/oracle/chainlink.rs",
"""//! Chainlink on-chain price feed integration.
//! Fetches USD price of each local currency from Chainlink's decentralized oracles.
//! Production only — requires RPC connection to Polygon.

use rust_decimal::Decimal;
use chrono::Utc;
use crate::currency::currencies::SupportedCurrency;
use crate::currency::rates::{ExchangeRate, RateSource};
use crate::config::Config;

/// Chainlink feed addresses on Polygon mainnet.
/// All feeds return local/USD price (how many USD per 1 unit of local).
fn feed_address(currency: &SupportedCurrency) -> Option<&'static str> {
    match currency {
        SupportedCurrency::ZAR => Some("0x..."), // ZAR/USD feed — TODO: real address
        SupportedCurrency::NGN => Some("0x..."), // NGN/USD feed
        SupportedCurrency::KES => Some("0x..."), // KES/USD feed
        SupportedCurrency::INR => Some("0x..."), // INR/USD feed
        SupportedCurrency::MXN => Some("0x..."), // MXN/USD feed
        SupportedCurrency::EGP => Some("0x..."), // EGP/USD feed
        SupportedCurrency::EUR => Some("0x..."), // EUR/USD feed
        SupportedCurrency::GBP => Some("0x..."), // GBP/USD feed
        _                      => None,
    }
}

pub async fn fetch(
    currency: &SupportedCurrency,
    config: &Config,
) -> anyhow::Result<ExchangeRate> {
    let _feed = feed_address(currency)
        .ok_or_else(|| anyhow::anyhow!("No Chainlink feed for {}", currency.code()))?;

    // TODO: implement ethers-rs / alloy call to Chainlink AggregatorV3Interface
    // Interface: latestRoundData() returns (roundId, answer, startedAt, updatedAt, answeredInRound)
    // answer is the price with 8 decimal places

    // Placeholder until ethers integration is complete
    anyhow::bail!("Chainlink integration TODO — use CoinGecko fallback for now")
}
""",
),

(
"src/oracle/coingecko.rs",
"""//! CoinGecko REST API rate fetcher.
//! Fallback when Chainlink is unavailable.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use std::str::FromStr;
use chrono::Utc;
use serde::Deserialize;
use crate::currency::currencies::SupportedCurrency;
use crate::currency::rates::{ExchangeRate, RateSource};
use crate::config::Config;

/// CoinGecko currency IDs for USD price.
fn coingecko_vs_currency(currency: &SupportedCurrency) -> Option<&'static str> {
    match currency {
        SupportedCurrency::ZAR => Some("zar"),
        SupportedCurrency::NGN => Some("ngn"),
        SupportedCurrency::KES => Some("kes"),
        SupportedCurrency::GHS => Some("ghs"),
        SupportedCurrency::INR => Some("inr"),
        SupportedCurrency::PHP => Some("php"),
        SupportedCurrency::MXN => Some("mxn"),
        SupportedCurrency::BRL => Some("brl"),
        SupportedCurrency::EGP => Some("egp"),
        SupportedCurrency::USD => Some("usd"),
        SupportedCurrency::EUR => Some("eur"),
        SupportedCurrency::GBP => Some("gbp"),
        _                      => None,
    }
}

#[derive(Deserialize)]
struct CoinGeckoResponse {
    #[serde(rename = "usd-coin")]
    usdc: std::collections::HashMap<String, f64>,
}

pub async fn fetch(
    currency: &SupportedCurrency,
    config: &Config,
) -> anyhow::Result<ExchangeRate> {
    let vs = coingecko_vs_currency(currency)
        .ok_or_else(|| anyhow::anyhow!("No CoinGecko mapping for {}", currency.code()))?;

    let url = format!(
        "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies={}",
        vs
    );

    let client = reqwest::Client::new();
    let mut req = client.get(&url);

    if !config.coingecko_api_key.is_empty() {
        req = req.header("x-cg-demo-api-key", &config.coingecko_api_key);
    }

    let resp: CoinGeckoResponse = req.send().await?.json().await?;

    let rate_f64 = resp.usdc.get(vs)
        .ok_or_else(|| anyhow::anyhow!("CoinGecko missing {} rate", vs))?;

    let usdc_to_local = Decimal::from_str(&rate_f64.to_string())?;
    let local_to_usdc = dec!(1) / usdc_to_local;

    tracing::info!(
        currency = %currency.code(),
        rate = %usdc_to_local,
        "CoinGecko rate fetched"
    );

    Ok(ExchangeRate {
        usdc_to_local,
        local_to_usdc,
        currency:   currency.clone(),
        fetched_at: Utc::now(),
        source:     RateSource::CoinGecko,
    })
}
""",
),

# ── src/fees/mod.rs ───────────────────────────────────────────────────────────

(
"src/fees/mod.rs",
"""//! Fee engine — every chipin revenue stream lives here.
//!
//! Fee hierarchy (applied in order):
//!   1. Platform fee        — on every contribution (0.5%)
//!   2. FX spread           — on every currency conversion (0.3%)
//!   3. Yield performance   — on DeFi yield earned (10% of yield)
//!   4. Withdrawal fee      — on every withdrawal (0.25%)
//!   5. Partner cut         — on bulk Market orders (1% to retailer)
//!
//! All fees are denominated in USDC internally.
//! Users see amounts in local currency — fee deduction is transparent
//! but the USDC mechanics are hidden.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use crate::config::Config;
use crate::currency::currencies::{Currency, SupportedCurrency};

pub mod calculator;
pub use calculator::FeeCalculator;

/// The result of fee calculation for a single operation.
#[derive(Debug, Clone, Serialize)]
pub struct FeeResult {
    /// Gross amount before any fees
    pub gross:              Decimal,
    /// Net amount after all applicable fees
    pub net:                Decimal,
    /// Platform fee (chipin revenue)
    pub platform_fee:       Decimal,
    /// FX spread (chipin revenue on conversion)
    pub fx_spread:          Decimal,
    /// Yield performance fee (chipin's cut of yield)
    pub yield_perf_fee:     Decimal,
    /// Withdrawal fee (chipin revenue)
    pub withdrawal_fee:     Decimal,
    /// Partner cut (paid out to retail partner)
    pub partner_cut:        Decimal,
    /// Total fees deducted
    pub total_fees:         Decimal,
    /// Currency all amounts are in (always USDC internally)
    pub currency:           SupportedCurrency,
}

impl FeeResult {
    /// chipin's total revenue from this operation (excludes partner cut).
    pub fn chipin_revenue(&self) -> Decimal {
        self.platform_fee + self.fx_spread + self.yield_perf_fee + self.withdrawal_fee
    }

    /// Total going out to partners.
    pub fn partner_revenue(&self) -> Decimal {
        self.partner_cut
    }

    pub fn summary(&self) -> String {
        format!(
            "gross={} net={} fees={} chipin_rev={} partner={}",
            self.gross, self.net, self.total_fees,
            self.chipin_revenue(), self.partner_cut
        )
    }
}
""",
),

(
"src/fees/calculator.rs",
"""//! Fee calculator — applies the right fees for each operation type.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::config::Config;
use crate::currency::currencies::SupportedCurrency;
use super::FeeResult;

pub struct FeeCalculator {
    config: Config,
}

impl FeeCalculator {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    /// Calculate fees for a member contribution.
    /// Platform fee applied. FX spread applied separately in converter.
    pub fn contribution(&self, gross_usdc: Decimal) -> FeeResult {
        let platform_fee = gross_usdc * Config::bps_to_decimal(self.config.platform_fee_bps);
        let net = gross_usdc - platform_fee;

        FeeResult {
            gross:          gross_usdc,
            net,
            platform_fee,
            fx_spread:      dec!(0), // applied separately in converter
            yield_perf_fee: dec!(0),
            withdrawal_fee: dec!(0),
            partner_cut:    dec!(0),
            total_fees:     platform_fee,
            currency:       SupportedCurrency::USDC,
        }
    }

    /// Calculate fees for a withdrawal.
    pub fn withdrawal(&self, gross_usdc: Decimal) -> FeeResult {
        let withdrawal_fee = gross_usdc * Config::bps_to_decimal(self.config.withdrawal_fee_bps);
        let net = gross_usdc - withdrawal_fee;

        FeeResult {
            gross:          gross_usdc,
            net,
            platform_fee:   dec!(0),
            fx_spread:      dec!(0),
            yield_perf_fee: dec!(0),
            withdrawal_fee,
            partner_cut:    dec!(0),
            total_fees:     withdrawal_fee,
            currency:       SupportedCurrency::USDC,
        }
    }

    /// Calculate chipin's performance fee on yield earned.
    /// Called monthly when yield is distributed.
    pub fn yield_performance(&self, gross_yield_usdc: Decimal) -> FeeResult {
        let perf_fee = gross_yield_usdc * Config::bps_to_decimal(self.config.yield_performance_fee_bps);
        let net = gross_yield_usdc - perf_fee;

        FeeResult {
            gross:          gross_yield_usdc,
            net,
            platform_fee:   dec!(0),
            fx_spread:      dec!(0),
            yield_perf_fee: perf_fee,
            withdrawal_fee: dec!(0),
            partner_cut:    dec!(0),
            total_fees:     perf_fee,
            currency:       SupportedCurrency::USDC,
        }
    }

    /// Calculate fees for a bulk Market order.
    /// Platform fee + partner cut both apply.
    pub fn market_order(&self, gross_usdc: Decimal) -> FeeResult {
        let platform_fee = gross_usdc * Config::bps_to_decimal(self.config.platform_fee_bps);
        let partner_cut  = gross_usdc * Config::bps_to_decimal(self.config.partner_cut_bps);
        let total_fees   = platform_fee + partner_cut;
        let net          = gross_usdc - total_fees;

        FeeResult {
            gross:          gross_usdc,
            net,
            platform_fee,
            fx_spread:      dec!(0),
            yield_perf_fee: dec!(0),
            withdrawal_fee: dec!(0),
            partner_cut,
            total_fees,
            currency:       SupportedCurrency::USDC,
        }
    }

    /// Calculate fees for a payout to a member.
    /// FX spread applied separately. Just the withdrawal fee here.
    pub fn payout(&self, gross_usdc: Decimal) -> FeeResult {
        self.withdrawal(gross_usdc)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    fn test_config() -> Config {
        Config {
            host: "0.0.0.0".into(),
            port: 60051,
            app_env: "test".into(),
            redis_url: "redis://localhost".into(),
            chainlink_rpc_url: "".into(),
            coingecko_api_key: "".into(),
            rate_refresh_interval: 60,
            usdc_contract_address: "".into(),
            settlement_network: "polygon".into(),
            settlement_wallet_address: "".into(),
            settlement_wallet_key: "".into(),
            aave_pool_address: "".into(),
            aave_data_provider: "".into(),
            minimum_yield_apy_pct: dec!(3.5),
            platform_fee_bps: 50,
            yield_performance_fee_bps: 1000,
            withdrawal_fee_bps: 25,
            fx_spread_bps: 30,
            partner_cut_bps: 100,
        }
    }

    #[test]
    fn test_contribution_fee() {
        let calc = FeeCalculator::new(test_config());
        // R500 → USDC 27.027 (at 18.5 rate) → platform fee 0.5%
        let result = calc.contribution(dec!(27.027));
        assert_eq!(result.platform_fee.round_dp(4), dec!(0.1351));
        assert!(result.net < result.gross);
        assert_eq!(result.chipin_revenue(), result.platform_fee);
    }

    #[test]
    fn test_yield_performance_fee() {
        let calc = FeeCalculator::new(test_config());
        // Pool earns 100 USDC yield → chipin takes 10%
        let result = calc.yield_performance(dec!(100));
        assert_eq!(result.yield_perf_fee, dec!(10));
        assert_eq!(result.net, dec!(90));
    }

    #[test]
    fn test_market_order_fee() {
        let calc = FeeCalculator::new(test_config());
        // R1806 bulk order → USDC 97.62 → platform 0.5% + partner 1%
        let result = calc.market_order(dec!(97.62));
        assert_eq!(result.platform_fee.round_dp(4), dec!(0.4881));
        assert_eq!(result.partner_cut.round_dp(4), dec!(0.9762));
        assert_eq!(result.total_fees, result.platform_fee + result.partner_cut);
    }
}
""",
),

# ── src/defi/mod.rs ───────────────────────────────────────────────────────────

(
"src/defi/mod.rs",
"""//! DeFi yield engine.
//!
//! chipin deposits pool USDC into Aave v3 on Polygon.
//! Users see nothing — their money just grows while it sits.
//!
//! Flow:
//!   Pool receives contribution (USDC)
//!       ↓ bigfinance routes to Aave
//!   Aave issues aUSDC (interest-bearing token)
//!       ↓ yield accrues per second
//!   Monthly: bigfinance harvests yield
//!       ↓ applies performance fee (10%)
//!       ↓ distributes remaining to members pro-rata
//!   Member receives yield in local currency at payout

pub mod aave;
pub mod yield_tracker;
pub mod distributor;

pub use yield_tracker::YieldTracker;
pub use distributor::YieldDistributor;
""",
),

(
"src/defi/aave.rs",
"""//! Aave v3 integration on Polygon.
//!
//! Aave is the yield protocol of choice:
//!   - Battle-tested ($10B+ TVL)
//!   - USDC deposit → aUSDC (auto-compounding)
//!   - Typical APY: 3–8% depending on market conditions
//!   - Polygon = low gas fees (< $0.01 per tx)

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use crate::config::Config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AavePosition {
    /// USDC deposited into Aave
    pub principal_usdc:    Decimal,
    /// Current aUSDC balance (principal + accrued yield)
    pub current_value_usdc: Decimal,
    /// Current APY from Aave data provider
    pub current_apy:       Decimal,
    /// Total yield earned since deposit
    pub yield_earned_usdc: Decimal,
}

impl AavePosition {
    pub fn yield_earned(&self) -> Decimal {
        self.current_value_usdc - self.principal_usdc
    }
}

pub struct AaveClient {
    config: Config,
}

impl AaveClient {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    /// Deposit USDC into Aave pool.
    /// Returns aUSDC balance after deposit.
    pub async fn deposit(&self, usdc_amount: Decimal) -> anyhow::Result<AavePosition> {
        // TODO: implement via ethers-rs / alloy
        // Call: AAVE_POOL.supply(USDC_ADDRESS, amount, on_behalf_of, referral_code)
        // Gas: ~$0.01 on Polygon

        tracing::info!(
            amount = %usdc_amount,
            pool = %self.config.aave_pool_address,
            "Aave deposit TODO"
        );

        // Stub response
        Ok(AavePosition {
            principal_usdc:    usdc_amount,
            current_value_usdc: usdc_amount,
            current_apy:       dec!(0.045), // 4.5% — typical USDC APY
            yield_earned_usdc: dec!(0),
        })
    }

    /// Withdraw USDC from Aave.
    pub async fn withdraw(&self, usdc_amount: Decimal) -> anyhow::Result<Decimal> {
        // TODO: Call: AAVE_POOL.withdraw(USDC_ADDRESS, amount, to)
        tracing::info!(amount = %usdc_amount, "Aave withdrawal TODO");
        Ok(usdc_amount)
    }

    /// Get current position (principal + yield).
    pub async fn get_position(&self, wallet: &str) -> anyhow::Result<AavePosition> {
        // TODO: Call AAVE_DATA_PROVIDER.getUserReserveData(USDC_ADDRESS, wallet)
        // Returns: aTokenBalance (= principal + yield), stableDebt, variableDebt, etc.
        tracing::info!(wallet = %wallet, "Aave position fetch TODO");
        Ok(AavePosition {
            principal_usdc:    dec!(0),
            current_value_usdc: dec!(0),
            current_apy:       dec!(0.045),
            yield_earned_usdc: dec!(0),
        })
    }

    /// Get current USDC supply APY from Aave.
    pub async fn get_current_apy(&self) -> anyhow::Result<Decimal> {
        // TODO: Call AAVE_DATA_PROVIDER.getReserveData(USDC_ADDRESS)
        // Returns: liquidityRate (ray units — divide by 1e27 for APY)
        Ok(dec!(0.045))
    }

    /// Check if current APY meets our minimum threshold.
    pub async fn meets_minimum_yield(&self) -> anyhow::Result<bool> {
        let apy = self.get_current_apy().await?;
        Ok(apy >= self.config.minimum_yield_apy_pct / dec!(100))
    }
}
""",
),

(
"src/defi/yield_tracker.rs",
"""//! Yield tracking per pool and per member.
//!
//! Tracks how much yield each pool has earned and
//! calculates each member's pro-rata share.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolYieldSnapshot {
    pub pool_id:           String,
    pub principal_usdc:    Decimal,
    pub current_usdc:      Decimal,
    pub yield_earned_usdc: Decimal,
    pub apy:               Decimal,
    pub snapshot_at:       chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberYieldShare {
    pub user_id:        String,
    pub pool_id:        String,
    /// Member's share of the pool (0.0 - 1.0)
    pub pool_share:     Decimal,
    /// Member's gross yield in USDC
    pub gross_yield:    Decimal,
    /// chipin's performance fee (10%)
    pub perf_fee:       Decimal,
    /// Member's net yield after fee
    pub net_yield:      Decimal,
}

pub struct YieldTracker;

impl YieldTracker {
    /// Calculate each member's yield share from a pool snapshot.
    ///
    /// Distribution is pro-rata by contribution amount.
    /// All members who contributed get a share proportional to
    /// how much they put in — equal power regardless of wealth.
    pub fn calculate_member_shares(
        snapshot: &PoolYieldSnapshot,
        member_contributions: &HashMap<String, Decimal>, // user_id → USDC contributed
        performance_fee_bps: u32,
    ) -> Vec<MemberYieldShare> {
        let total_contributed: Decimal = member_contributions.values().sum();
        if total_contributed == dec!(0) {
            return vec![];
        }

        let perf_fee_rate = crate::config::Config::bps_to_decimal(performance_fee_bps);
        let gross_yield   = snapshot.yield_earned_usdc;

        member_contributions.iter().map(|(user_id, contribution)| {
            let pool_share  = contribution / total_contributed;
            let member_gross = gross_yield * pool_share;
            let perf_fee    = member_gross * perf_fee_rate;
            let net_yield   = member_gross - perf_fee;

            MemberYieldShare {
                user_id:    user_id.clone(),
                pool_id:    snapshot.pool_id.clone(),
                pool_share,
                gross_yield: member_gross,
                perf_fee,
                net_yield,
            }
        }).collect()
    }

    /// Annualised yield rate for display (e.g. "4.5% p.a.")
    pub fn annualised_apy(
        principal: Decimal,
        yield_earned: Decimal,
        days_elapsed: u32,
    ) -> Decimal {
        if principal == dec!(0) || days_elapsed == 0 {
            return dec!(0);
        }
        let daily_rate = yield_earned / principal / Decimal::from(days_elapsed);
        daily_rate * dec!(365) * dec!(100) // as percentage
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;
    use chrono::Utc;

    #[test]
    fn test_equal_contribution_equal_yield() {
        let snapshot = PoolYieldSnapshot {
            pool_id:           "pool1".into(),
            principal_usdc:    dec!(1000),
            current_usdc:      dec!(1045),
            yield_earned_usdc: dec!(45),
            apy:               dec!(0.045),
            snapshot_at:       Utc::now(),
        };

        let mut contributions = HashMap::new();
        contributions.insert("alice".into(), dec!(500));
        contributions.insert("bob".into(),   dec!(500));

        let shares = YieldTracker::calculate_member_shares(&snapshot, &contributions, 1000);

        // Each should get 50% of the yield minus 10% perf fee
        for share in &shares {
            assert_eq!(share.pool_share, dec!(0.5));
            assert_eq!(share.gross_yield, dec!(22.5));  // 50% of 45
            assert_eq!(share.perf_fee,    dec!(2.25));  // 10% of 22.5
            assert_eq!(share.net_yield,   dec!(20.25)); // gross - perf_fee
        }
    }

    #[test]
    fn test_unequal_contribution_proportional_yield() {
        let snapshot = PoolYieldSnapshot {
            pool_id:           "pool2".into(),
            principal_usdc:    dec!(900),
            current_usdc:      dec!(940.5),
            yield_earned_usdc: dec!(40.5),
            apy:               dec!(0.045),
            snapshot_at:       Utc::now(),
        };

        let mut contributions = HashMap::new();
        contributions.insert("big".into(),   dec!(600)); // 2/3
        contributions.insert("small".into(), dec!(300)); // 1/3

        let shares = YieldTracker::calculate_member_shares(&snapshot, &contributions, 1000);
        let big   = shares.iter().find(|s| s.user_id == "big").unwrap();
        let small = shares.iter().find(|s| s.user_id == "small").unwrap();

        // Big contributor gets 2x the yield of small
        assert!((big.net_yield - small.net_yield * dec!(2)).abs() < dec!(0.001));
    }
}
""",
),

(
"src/defi/distributor.rs",
"""//! Yield distributor — sends yield to members monthly.
//! Called by the background job in motherlode.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::defi::yield_tracker::{MemberYieldShare, YieldTracker, PoolYieldSnapshot};
use std::collections::HashMap;

pub struct YieldDistributor;

impl YieldDistributor {
    /// Distribute yield for a pool to all members.
    /// Returns the distribution plan — motherlode executes the actual payments.
    pub fn plan(
        snapshot: &PoolYieldSnapshot,
        member_contributions: &HashMap<String, Decimal>,
        performance_fee_bps: u32,
    ) -> DistributionPlan {
        let shares = YieldTracker::calculate_member_shares(
            snapshot,
            member_contributions,
            performance_fee_bps,
        );

        let chipin_revenue: Decimal = shares.iter().map(|s| s.perf_fee).sum();
        let total_distributed: Decimal = shares.iter().map(|s| s.net_yield).sum();

        DistributionPlan {
            pool_id:          snapshot.pool_id.clone(),
            total_yield:      snapshot.yield_earned_usdc,
            chipin_revenue,
            total_distributed,
            shares,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DistributionPlan {
    pub pool_id:          String,
    pub total_yield:      Decimal,
    pub chipin_revenue:   Decimal,
    pub total_distributed: Decimal,
    pub shares:           Vec<MemberYieldShare>,
}

impl DistributionPlan {
    pub fn verify(&self) -> bool {
        // Conservation check: total_yield = chipin_revenue + total_distributed
        let sum = self.chipin_revenue + self.total_distributed;
        (sum - self.total_yield).abs() < dec!(0.000001)
    }
}
""",
),

# ── src/pipeline/mod.rs ───────────────────────────────────────────────────────

(
"src/pipeline/mod.rs",
"""//! Transaction pipeline — the main entry point.
//!
//! Every financial operation in chipin passes through here.
//! motherlode calls bigfinance BEFORE writing to the database.
//!
//! The pipeline:
//!   1. Validate the operation
//!   2. Convert currency (local → USDC)
//!   3. Apply fees (platform, FX spread)
//!   4. Route to DeFi (Aave deposit)
//!   5. Record revenue split
//!   6. Return settlement confirmation to motherlode

pub mod contribution;
pub mod withdrawal;
pub mod payout;
pub mod market_order;

use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use crate::currency::currencies::{Currency, SupportedCurrency};

/// A settled transaction — returned to motherlode after bigfinance processes it.
/// motherlode writes this to the database as confirmation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettlementResult {
    /// chipin's internal reference
    pub reference:        String,
    /// User's local currency input
    pub local_input:      Currency,
    /// USDC amount after conversion + fees
    pub usdc_settled:     Decimal,
    /// chipin revenue from this transaction (USDC)
    pub chipin_revenue:   Decimal,
    /// Partner revenue if applicable (USDC)
    pub partner_revenue:  Decimal,
    /// Whether funds are in Aave generating yield
    pub is_in_yield:      bool,
    /// Current APY if in yield
    pub current_apy:      Option<Decimal>,
    /// Settlement timestamp
    pub settled_at:       String,
}
""",
),

(
"src/pipeline/contribution.rs",
"""//! Contribution pipeline.
//!
//! When a member contributes:
//!   1. Convert local → USDC
//!   2. Deduct platform fee (0.5%)
//!   3. Deposit net USDC into Aave
//!   4. Record revenue
//!   5. Return settlement confirmation

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::Utc;
use uuid::Uuid;
use crate::config::Config;
use crate::currency::{
    currencies::SupportedCurrency,
    converter::CurrencyConverter,
    rates::RateCache,
};
use crate::defi::aave::AaveClient;
use crate::fees::FeeCalculator;
use crate::revenue::RevenueRecorder;
use super::SettlementResult;

pub struct ContributionPipeline {
    pub converter: CurrencyConverter,
    pub fees:      FeeCalculator,
    pub aave:      AaveClient,
    pub config:    Config,
}

pub struct ContributionRequest {
    pub user_id:    String,
    pub pool_id:    String,
    pub amount:     Decimal,
    pub currency:   SupportedCurrency,
}

impl ContributionPipeline {
    pub async fn process(
        &mut self,
        req: ContributionRequest,
    ) -> anyhow::Result<SettlementResult> {
        let reference = format!("CONTRIB-{}", Uuid::new_v4());

        tracing::info!(
            reference = %reference,
            user_id   = %req.user_id,
            pool_id   = %req.pool_id,
            amount    = %req.amount,
            currency  = %req.currency.code(),
            "Processing contribution"
        );

        // Step 1: Convert local → USDC (includes FX spread)
        let conversion = self.converter
            .local_to_usdc(req.amount, req.currency.clone())
            .await?;

        let gross_usdc = conversion.output.amount;

        // Step 2: Apply platform fee
        let fee_result = self.fees.contribution(gross_usdc);

        let net_usdc = fee_result.net;

        // Step 3: Deposit net USDC into Aave
        let position = self.aave.deposit(net_usdc).await?;

        // Step 4: Calculate total chipin revenue
        let chipin_revenue = fee_result.chipin_revenue() + conversion.spread_revenue.amount;

        tracing::info!(
            reference     = %reference,
            gross_usdc    = %gross_usdc,
            net_usdc      = %net_usdc,
            platform_fee  = %fee_result.platform_fee,
            fx_spread     = %conversion.spread_revenue.amount,
            chipin_revenue = %chipin_revenue,
            apy           = %position.current_apy,
            "Contribution settled"
        );

        Ok(SettlementResult {
            reference,
            local_input:   crate::currency::currencies::Currency::new(req.amount, req.currency),
            usdc_settled:  net_usdc,
            chipin_revenue,
            partner_revenue: dec!(0),
            is_in_yield:   true,
            current_apy:   Some(position.current_apy),
            settled_at:    Utc::now().to_rfc3339(),
        })
    }
}
""",
),

(
"src/pipeline/withdrawal.rs",
"""//! Withdrawal pipeline.
//!
//! When a member withdraws:
//!   1. Withdraw USDC from Aave
//!   2. Deduct withdrawal fee (0.25%)
//!   3. Convert USDC → local (with FX spread)
//!   4. Record revenue
//!   5. Return settlement confirmation

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::Utc;
use uuid::Uuid;
use crate::config::Config;
use crate::currency::{
    currencies::SupportedCurrency,
    converter::CurrencyConverter,
};
use crate::defi::aave::AaveClient;
use crate::fees::FeeCalculator;
use super::SettlementResult;

pub struct WithdrawalPipeline {
    pub converter: CurrencyConverter,
    pub fees:      FeeCalculator,
    pub aave:      AaveClient,
}

pub struct WithdrawalRequest {
    pub user_id:         String,
    pub pool_id:         String,
    pub usdc_amount:     Decimal,
    pub target_currency: SupportedCurrency,
}

impl WithdrawalPipeline {
    pub async fn process(
        &mut self,
        req: WithdrawalRequest,
    ) -> anyhow::Result<SettlementResult> {
        let reference = format!("WITHDRAW-{}", Uuid::new_v4());

        // Step 1: Withdraw from Aave
        let usdc_withdrawn = self.aave.withdraw(req.usdc_amount).await?;

        // Step 2: Apply withdrawal fee
        let fee_result = self.fees.withdrawal(usdc_withdrawn);
        let net_usdc   = fee_result.net;

        // Step 3: Convert USDC → local (FX spread applied here)
        let conversion = self.converter
            .usdc_to_local(net_usdc, req.target_currency.clone())
            .await?;

        let chipin_revenue = fee_result.withdrawal_fee + conversion.spread_revenue.amount;

        tracing::info!(
            reference  = %reference,
            usdc_out   = %net_usdc,
            local_out  = %conversion.output.format(),
            chipin_rev = %chipin_revenue,
            "Withdrawal settled"
        );

        Ok(SettlementResult {
            reference,
            local_input:    conversion.output,
            usdc_settled:   net_usdc,
            chipin_revenue,
            partner_revenue: dec!(0),
            is_in_yield:    false,
            current_apy:    None,
            settled_at:     Utc::now().to_rfc3339(),
        })
    }
}
""",
),

(
"src/pipeline/payout.rs",
"""//! Payout pipeline — rotating stokvel payout to the next recipient.
//! Withdrawal fee applies. FX spread applies.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::Utc;
use uuid::Uuid;
use crate::currency::currencies::SupportedCurrency;
use crate::defi::aave::AaveClient;
use crate::fees::FeeCalculator;
use crate::currency::converter::CurrencyConverter;
use super::SettlementResult;

pub struct PayoutPipeline {
    pub converter: CurrencyConverter,
    pub fees:      FeeCalculator,
    pub aave:      AaveClient,
}

pub struct PayoutRequest {
    pub pool_id:          String,
    pub recipient_id:     String,
    pub usdc_amount:      Decimal,
    pub local_currency:   SupportedCurrency,
}

impl PayoutPipeline {
    pub async fn process(&mut self, req: PayoutRequest) -> anyhow::Result<SettlementResult> {
        let reference = format!("PAYOUT-{}", Uuid::new_v4());

        // Withdraw from Aave
        let withdrawn = self.aave.withdraw(req.usdc_amount).await?;

        // Apply payout fee (same as withdrawal)
        let fees     = self.fees.payout(withdrawn);
        let net_usdc = fees.net;

        // Convert to local currency
        let conversion = self.converter
            .usdc_to_local(net_usdc, req.local_currency).await?;

        let chipin_revenue = fees.withdrawal_fee + conversion.spread_revenue.amount;

        tracing::info!(
            reference    = %reference,
            recipient_id = %req.recipient_id,
            local_amount = %conversion.output.format(),
            chipin_rev   = %chipin_revenue,
            "Payout settled"
        );

        Ok(SettlementResult {
            reference,
            local_input:    conversion.output,
            usdc_settled:   net_usdc,
            chipin_revenue,
            partner_revenue: dec!(0),
            is_in_yield:    false,
            current_apy:    None,
            settled_at:     Utc::now().to_rfc3339(),
        })
    }
}
""",
),

(
"src/pipeline/market_order.rs",
"""//! Market order pipeline — bulk grocery order processing.
//! Platform fee + partner cut both apply.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use chrono::Utc;
use uuid::Uuid;
use crate::currency::currencies::SupportedCurrency;
use crate::currency::converter::CurrencyConverter;
use crate::fees::FeeCalculator;
use super::SettlementResult;

pub struct MarketOrderPipeline {
    pub converter: CurrencyConverter,
    pub fees:      FeeCalculator,
}

pub struct MarketOrderRequest {
    pub pool_id:     String,
    pub retailer_id: String,
    pub amount:      Decimal,
    pub currency:    SupportedCurrency,
}

impl MarketOrderPipeline {
    pub async fn process(&mut self, req: MarketOrderRequest) -> anyhow::Result<SettlementResult> {
        let reference = format!("MARKET-{}", Uuid::new_v4());

        // Convert to USDC
        let conversion = self.converter
            .local_to_usdc(req.amount, req.currency.clone()).await?;

        let gross_usdc = conversion.output.amount;

        // Apply market order fees (platform + partner)
        let fees = self.fees.market_order(gross_usdc);

        let chipin_revenue  = fees.platform_fee + conversion.spread_revenue.amount;
        let partner_revenue = fees.partner_cut;

        tracing::info!(
            reference      = %reference,
            retailer_id    = %req.retailer_id,
            gross_usdc     = %gross_usdc,
            chipin_rev     = %chipin_revenue,
            partner_rev    = %partner_revenue,
            "Market order settled"
        );

        Ok(SettlementResult {
            reference,
            local_input:    crate::currency::currencies::Currency::new(req.amount, req.currency),
            usdc_settled:   fees.net,
            chipin_revenue,
            partner_revenue,
            is_in_yield:    false,
            current_apy:    None,
            settled_at:     Utc::now().to_rfc3339(),
        })
    }
}
""",
),

# ── src/revenue/mod.rs ────────────────────────────────────────────────────────

(
"src/revenue/mod.rs",
"""//! Revenue accounting — every cent chipin earns is tracked here.
//!
//! Revenue streams:
//!   1. Platform fee       (0.5% per contribution)
//!   2. FX spread          (0.3% per conversion)
//!   3. Yield performance  (10% of DeFi yield)
//!   4. Withdrawal fee     (0.25% per withdrawal)
//!   5. Partner cut        (1% of bulk orders — flows to retailer)
//!
//! This module provides the ledger.
//! motherlode writes the actual DB records.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RevenueStream {
    PlatformFee,
    FxSpread,
    YieldPerformance,
    WithdrawalFee,
    PartnerCut { retailer_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevenueEvent {
    pub id:          String,
    pub stream:      RevenueStream,
    pub amount_usdc: Decimal,
    pub reference:   String,  // transaction reference
    pub pool_id:     Option<String>,
    pub user_id:     Option<String>,
    pub recorded_at: DateTime<Utc>,
}

/// Revenue recorder — emits events for motherlode to persist.
pub struct RevenueRecorder {
    events: Vec<RevenueEvent>,
}

impl RevenueRecorder {
    pub fn new() -> Self {
        Self { events: vec![] }
    }

    pub fn record(
        &mut self,
        stream: RevenueStream,
        amount_usdc: Decimal,
        reference: &str,
        pool_id: Option<&str>,
        user_id: Option<&str>,
    ) {
        if amount_usdc <= dec!(0) { return; }
        self.events.push(RevenueEvent {
            id:          uuid::Uuid::new_v4().to_string(),
            stream,
            amount_usdc,
            reference:   reference.to_string(),
            pool_id:     pool_id.map(|s| s.to_string()),
            user_id:     user_id.map(|s| s.to_string()),
            recorded_at: Utc::now(),
        });
    }

    pub fn drain(&mut self) -> Vec<RevenueEvent> {
        std::mem::take(&mut self.events)
    }

    pub fn total(&self) -> Decimal {
        self.events.iter().map(|e| e.amount_usdc).sum()
    }
}
""",
),

# ── src/settlement/mod.rs ─────────────────────────────────────────────────────

(
"src/settlement/mod.rs",
"""//! Settlement layer — USDC movement on Polygon.
//!
//! This is where USDC actually moves on-chain.
//! For now it's a stub — full implementation requires:
//!   - ethers-rs or alloy for EVM interaction
//!   - Polygon RPC connection
//!   - Custodial wallet management (Fireblocks or similar in production)
//!
//! chipin starts custodial (we hold the keys) and moves toward
//! non-custodial as the platform matures.

use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use crate::config::Config;

pub struct SettlementLayer {
    config: Config,
}

impl SettlementLayer {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    /// Transfer USDC from user wallet to pool wallet.
    pub async fn deposit_to_pool(
        &self,
        from_user: &str,
        to_pool:   &str,
        amount:    Decimal,
    ) -> anyhow::Result<String> {
        // TODO: ERC-20 transfer via ethers-rs
        // USDC.transfer(to_pool_wallet, amount_in_6_decimals)
        tracing::info!(
            from = %from_user,
            to   = %to_pool,
            usdc = %amount,
            "USDC pool deposit TODO"
        );
        Ok(format!("0x{:064x}", 0)) // placeholder tx hash
    }

    /// Transfer USDC from pool wallet to user wallet (payout).
    pub async fn payout_from_pool(
        &self,
        from_pool: &str,
        to_user:   &str,
        amount:    Decimal,
    ) -> anyhow::Result<String> {
        // TODO: ERC-20 transfer
        tracing::info!(
            from = %from_pool,
            to   = %to_user,
            usdc = %amount,
            "USDC payout TODO"
        );
        Ok(format!("0x{:064x}", 0))
    }

    /// Format USDC amount for EVM (6 decimal places).
    /// e.g. 27.50 USDC → 27_500_000 (uint256)
    pub fn to_evm_units(amount: Decimal) -> u64 {
        (amount * dec!(1_000_000)).to_string()
            .split('.').next()
            .and_then(|s| s.parse().ok())
            .unwrap_or(0)
    }

    /// Parse EVM units back to Decimal.
    pub fn from_evm_units(units: u64) -> Decimal {
        Decimal::from(units) / dec!(1_000_000)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    #[test]
    fn test_evm_units() {
        assert_eq!(SettlementLayer::to_evm_units(dec!(27.50)), 27_500_000);
        assert_eq!(SettlementLayer::to_evm_units(dec!(1.0)),   1_000_000);
        assert_eq!(SettlementLayer::from_evm_units(27_500_000), dec!(27.5));
    }
}
""",
),

# ── src/proto.rs ──────────────────────────────────────────────────────────────

(
"src/proto.rs",
"""//! bigfinance gRPC proto types.
//! bigfinance exposes its own gRPC service to motherlode.
//! motherlode calls bigfinance before writing to DB.

// TODO: define bigfinance.proto in proto/ dir
// For now: motherlode calls bigfinance via its Rust API directly (same process or IPC)
""",
),

# ── src/server.rs ─────────────────────────────────────────────────────────────

(
"src/server.rs",
"""//! bigfinance server — can run as:
//!   1. Embedded library (called directly from motherlode in the same process)
//!   2. Standalone gRPC service (separate process for scale)
//!
//! Start with option 1 for simplicity, move to 2 when scaling.

use crate::config::Config;
use crate::currency::rates::RateCache;
use crate::oracle;

pub async fn run(config: Config) -> anyhow::Result<()> {
    // Connect Redis for rate cache
    let redis_client = redis::Client::open(config.redis_url.clone())?;
    let redis        = redis::aio::ConnectionManager::new(redis_client).await?;
    let mut cache    = RateCache::new(redis.clone());

    // Pre-warm rate cache on startup
    tracing::info!("Pre-warming rate cache...");
    let currencies = vec![
        crate::currency::currencies::SupportedCurrency::ZAR,
        crate::currency::currencies::SupportedCurrency::NGN,
        crate::currency::currencies::SupportedCurrency::KES,
        crate::currency::currencies::SupportedCurrency::INR,
        crate::currency::currencies::SupportedCurrency::MXN,
        crate::currency::currencies::SupportedCurrency::EGP,
    ];

    for currency in &currencies {
        match oracle::fetch_rate(currency, &config).await {
            Ok(rate) => {
                tracing::info!(
                    currency = %currency.code(),
                    rate     = %rate.usdc_to_local,
                    "Rate cached"
                );
                cache.set(&rate).await.ok();
            }
            Err(e) => {
                tracing::warn!(currency = %currency.code(), error = %e, "Rate fetch failed");
            }
        }
    }

    // Spawn background rate refresher
    let config_clone = config.clone();
    let redis_clone  = redis.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(
            std::time::Duration::from_secs(config_clone.rate_refresh_interval)
        );
        let mut cache = RateCache::new(redis_clone);
        loop {
            interval.tick().await;
            for currency in &currencies {
                if let Ok(rate) = oracle::fetch_rate(currency, &config_clone).await {
                    cache.set(&rate).await.ok();
                }
            }
        }
    });

    tracing::info!("bigfinance ready — rates refreshing every {}s", config.rate_refresh_interval);

    // TODO: start gRPC server when bigfinance.proto is defined
    // For now: block forever (background tasks run)
    tokio::signal::ctrl_c().await?;
    tracing::info!("bigfinance shutting down");

    Ok(())
}
""",
),

# ── README ────────────────────────────────────────────────────────────────────

(
"README.md",
"""# bigfinance

chipin's DeFi + multi-currency + fee engine.

Every financial operation in chipin passes through bigfinance **before** motherlode touches the database. This is the money brain.

## What lives here

| Module | Responsibility |
|---|---|
| `currency/` | 28 currencies, USDC as internal settlement layer |
| `oracle/` | Live exchange rates via Chainlink (prod) + CoinGecko (fallback) |
| `fees/` | Platform fee, FX spread, yield performance, withdrawal fee, partner cut |
| `defi/` | Aave v3 deposit/withdraw, yield tracking, pro-rata distribution |
| `pipeline/` | Contribution, withdrawal, payout, market order flows |
| `revenue/` | Revenue ledger — every chipin earning tracked |
| `settlement/` | USDC on-chain movement (Polygon) |

## Fee structure

| Stream | Rate | Applied on |
|---|---|---|
| Platform fee | 0.5% | Every contribution |
| FX spread | 0.3% | Every currency conversion |
| Yield performance | 10% | Monthly yield earned |
| Withdrawal fee | 0.25% | Every withdrawal |
| Partner cut | 1% | Bulk Market orders (paid to retailer) |

## Never use f64 for money

All amounts use `rust_decimal::Decimal`. No floating point. Ever.

## DeFi yield flow

```
Member chips in R500 (ZAR)
    ↓ convert ZAR → USDC at live rate (0.3% spread)
    ↓ deduct platform fee (0.5%)
    ↓ deposit net USDC into Aave v3 on Polygon
Pool earns ~4.5% APY while it sits
    ↓ monthly harvest
    ↓ chipin takes 10% performance fee
    ↓ remainder distributed pro-rata to members
    ↓ convert USDC → local currency at payout (0.3% spread + 0.25% withdrawal)
Member receives local currency — never sees USDC
```
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
💰  bigfinance scaffolded.

Structure:
  bigfinance/
    src/
      currency/     — 28 currencies, USDC settlement, rate cache
      oracle/       — Chainlink (prod) + CoinGecko (fallback) price feeds
      fees/         — every revenue stream, basis points, tested
      defi/         — Aave v3, yield tracking, pro-rata distribution
      pipeline/     — contribution, withdrawal, payout, market order
      revenue/      — revenue ledger
      settlement/   — USDC on Polygon (stub, needs ethers-rs)

Add to workspace Cargo.toml:
  members = ["motherlode", "speedcrime", "bigfinance"]

Next priorities:
  1. Wire bigfinance into motherlode contribution handler
  2. Implement CoinGecko fetcher (ZAR rates live immediately)
  3. Add ethers-rs for USDC ERC-20 transfers on Polygon
  4. Implement Aave v3 deposit/withdraw via alloy
  5. Add Chainlink feeds for production

Key rule: bigfinance ALWAYS runs before motherlode writes to DB.
""")

if __name__ == "__main__":
    scaffold()
