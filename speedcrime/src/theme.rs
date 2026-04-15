//! StockFair design tokens.
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
