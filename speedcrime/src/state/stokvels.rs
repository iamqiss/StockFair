//! Stokvel list and detail state.

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
