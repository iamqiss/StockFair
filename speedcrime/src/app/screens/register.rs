//! Registration screen — 4 steps + OTP, wired to motherlode.
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
