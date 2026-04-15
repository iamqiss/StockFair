//! Card component — the fundamental surface for stokvels, market items, etc.

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
