//! Login screen wired to motherlode /auth/signin

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;

use crate::state::app::{AppState, Route};
use crate::state::auth::AuthState;
use crate::api::client::ApiClient;
use crate::api::auth::{AuthApi, SignInPayload};
use crate::i18n::translations::{t, TranslationKey};
use crate::theme::Theme;
use crate::components::input::text_input;
use crate::components::button::primary_button;

pub fn login_screen(ctx: &WindowedContext) -> impl ElementBuilder {
    let app_state  = ctx.use_state_keyed("app_state", AppState::default);
    let auth_state = ctx.use_state_keyed("auth_state", AuthState::default);
    let theme      = app_state.get().theme();
    let lang       = app_state.get().language;

    // Form state
    let identifier = ctx.use_state_keyed("login_id",   || String::new());
    let password   = ctx.use_state_keyed("login_pass", || String::new());
    let error      = ctx.use_state_keyed("login_err",  || String::new());
    let loading    = ctx.use_state_keyed("login_load", || false);

    div()
        .w_full()
        .h_full()
        .bg(theme.bg_primary)
        .flex_col()
        // ── Header ────────────────────────────────────────────────────────
        .child(
            div()
                .w_full()
                .bg(Color::rgba(0.0, 0.0, 0.0, 1.0))
                .px(Theme::sp(6.0))
                .pt(Theme::sp(12.0))
                .pb(Theme::sp(8.0))
                .flex_col()
                .items_center()
                .gap(Theme::sp(2.0))
                .child(
                    div()
                        .square(56.0)
                        .rounded(Theme::radius_full())
                        .bg(Color::rgba(0.11, 0.11, 0.11, 1.0))
                        .flex_center()
                        .child(text("SF").size(20.0).weight(FontWeight::Bold).color(Color::WHITE))
                )
                .child(text(t(lang, TranslationKey::WelcomeBack)).size(26.0).weight(FontWeight::Bold).color(Color::WHITE))
                .child(text("Sign in to your StockFair account").size(14.0).color(Color::rgba(1.0,1.0,1.0,0.5)))
        )
        // ── Form card ─────────────────────────────────────────────────────
        .child(
            div()
                .w_full()
                .flex_1()
                .px(Theme::sp(5.0))
                .py(Theme::sp(6.0))
                .flex_col()
                .gap(Theme::sp(4.0))
                // Error banner
                .child(
                    stateful::<NoState>()
                        .deps([error.signal_id()])
                        .on_state(move |_ctx| {
                            let err = error.get();
                            if err.is_empty() {
                                div().w(0.0).h(0.0) // hidden
                            } else {
                                div()
                                    .w_full()
                                    .px(Theme::sp(3.0))
                                    .py(Theme::sp(3.0))
                                    .rounded(Theme::radius_md())
                                    .bg(Color::rgba(0.898, 0.243, 0.243, 0.1))
                                    .child(text(&err).size(13.0).color(Color::rgba(0.898, 0.243, 0.243, 1.0)))
                            }
                        })
                )
                // Identifier input
                .child(text_input(
                    ctx,
                    "login_id",
                    "Phone or email",
                    identifier.clone(),
                    theme.clone(),
                ))
                // Password input
                .child(text_input(
                    ctx,
                    "login_pass",
                    "Password",
                    password.clone(),
                    theme.clone(),
                ))
                // Forgot password
                .child(
                    div()
                        .w_full()
                        .flex_row()
                        .justify_end()
                        .child(
                            stateful::<ButtonState>()
                                .on_click(move |_| {
                                    app_state.update(|mut s| {
                                        s.current_route = Route::Login; // TODO: forgot password route
                                        s
                                    });
                                })
                                .child(
                                    text(t(lang, TranslationKey::ForgotPassword))
                                        .size(13.0)
                                        .weight(FontWeight::SemiBold)
                                        .color(theme.text_primary)
                                )
                        )
                )
                // Sign in button
                .child(
                    stateful::<ButtonState>()
                        .w_full()
                        .h(54.0)
                        .rounded(Theme::radius_md())
                        .flex_center()
                        .on_state(move |_ctx| {
                            div()
                                .w_full().h_full()
                                .rounded(Theme::radius_md())
                                .bg(match _ctx.state() {
                                    ButtonState::Pressed => Color::rgba(0.2, 0.2, 0.2, 1.0),
                                    _ => Color::rgba(0.039, 0.039, 0.039, 1.0),
                                })
                                .flex_center()
                                .child(text(t(lang, TranslationKey::SignIn)).size(16.0).weight(FontWeight::Bold).color(Color::WHITE))
                        })
                        .on_click(move |_| {
                            let id   = identifier.get();
                            let pass = password.get();
                            if id.is_empty() || pass.is_empty() {
                                error.set("Please enter your phone/email and password.".to_string());
                                return;
                            }
                            loading.set(true);
                            error.set(String::new());

                            // Normalise SA phone
                            let id = if id.starts_with('0') && id.len() == 10 {
                                format!("+27{}", &id[1..])
                            } else { id };

                            // TODO: spawn async task to call motherlode
                            // For now: placeholder
                            loading.set(false);
                        })
                )
        )
}
