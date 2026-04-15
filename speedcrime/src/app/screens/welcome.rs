//! Welcome screen — entry point, social & privacy-first framing.
//!
//! "Your stokvel. Your circle. Your money."
//! Authentic to the communal origin of stokvels.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;

use crate::state::app::{AppState, Route};
use crate::i18n::translations::{t, TranslationKey};
use crate::theme::Theme;

pub fn welcome_screen(ctx: &WindowedContext) -> impl ElementBuilder {
    let app_state = ctx.use_state_keyed("app_state", AppState::default);
    let theme     = app_state.get().theme();
    let lang      = app_state.get().language;

    div()
        .w_full()
        .h_full()
        .bg(theme.bg_primary)
        .flex_col()
        .justify_between()
        .p_px(0.0)
        // ── Hero section ──────────────────────────────────────────────────
        .child(
            div()
                .w_full()
                .flex_1()
                .flex_col()
                .justify_center()
                .items_center()
                .gap(Theme::sp(4.0))
                .px(Theme::sp(6.0))
                // Logo mark
                .child(
                    div()
                        .square(80.0)
                        .rounded(Theme::radius_xl())
                        .bg(theme.accent)
                        .flex_center()
                        .child(
                            text("SF")
                                .size(32.0)
                                .weight(FontWeight::Bold)
                                .color(theme.bg_primary)
                        )
                )
                // Title
                .child(
                    text(t(lang, TranslationKey::WelcomeTitle))
                        .size(32.0)
                        .weight(FontWeight::Bold)
                        .color(theme.text_primary)
                        .align(TextAlign::Center)
                )
                // Tagline
                .child(
                    text(t(lang, TranslationKey::WelcomeTagline))
                        .size(16.0)
                        .color(theme.text_muted)
                        .align(TextAlign::Center)
                )
                // Privacy statement — core brand value
                .child(
                    div()
                        .mt(Theme::sp(4.0))
                        .px(Theme::sp(4.0))
                        .py(Theme::sp(3.0))
                        .rounded(Theme::radius_md())
                        .bg(theme.bg_card)
                        .child(
                            text("Your data stays in your circle. We never sell it.")
                                .size(13.0)
                                .color(theme.text_secondary)
                                .align(TextAlign::Center)
                        )
                )
        )
        // ── CTA buttons ───────────────────────────────────────────────────
        .child(
            div()
                .w_full()
                .flex_col()
                .gap(Theme::sp(3.0))
                .px(Theme::sp(5.0))
                .pb(Theme::sp(10.0))
                // Primary: Create account
                .child(
                    stateful::<ButtonState>()
                        .w_full()
                        .h(54.0)
                        .rounded(Theme::radius_md())
                        .bg(theme.accent)
                        .flex_center()
                        .on_state(move |_ctx| {
                            div()
                                .bg(match _ctx.state() {
                                    ButtonState::Hovered => Color::rgba(0.9, 0.9, 0.9, 1.0),
                                    ButtonState::Pressed => Color::rgba(0.75, 0.75, 0.75, 1.0),
                                    _ => theme.accent,
                                })
                                .w_full()
                                .h_full()
                                .rounded(Theme::radius_md())
                                .flex_center()
                                .child(
                                    text(t(lang, TranslationKey::CreateAccount))
                                        .size(16.0)
                                        .weight(FontWeight::Bold)
                                        .color(theme.bg_primary)
                                )
                        })
                        .on_click(move |_| {
                            app_state.update(|mut s| {
                                s.current_route = Route::Register;
                                s
                            });
                        })
                )
                // Secondary: Sign in
                .child(
                    stateful::<ButtonState>()
                        .w_full()
                        .h(54.0)
                        .rounded(Theme::radius_md())
                        .border(1.5, theme.border_strong)
                        .flex_center()
                        .on_click(move |_| {
                            app_state.update(|mut s| {
                                s.current_route = Route::Login;
                                s
                            });
                        })
                        .child(
                            text(t(lang, TranslationKey::SignIn))
                                .size(16.0)
                                .weight(FontWeight::SemiBold)
                                .color(theme.text_primary)
                        )
                )
                // Trust line
                .child(
                    div()
                        .flex_row()
                        .items_center()
                        .justify_center()
                        .gap(6.0)
                        .child(
                            text("256-bit encrypted · FICA compliant · POPIA protected")
                                .size(11.0)
                                .color(theme.text_muted)
                                .align(TextAlign::Center)
                        )
                )
        )
}
