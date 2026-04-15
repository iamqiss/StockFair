//! Global app state — theme, language, navigation.

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
