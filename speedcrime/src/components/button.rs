//! Reusable button components.

use blinc_app::prelude::*;
use blinc_layout::stateful::stateful;
use crate::theme::Theme;

pub fn primary_button(
    label: &'static str,
    theme: Theme,
    on_press: impl Fn() + Send + Sync + 'static,
) -> impl ElementBuilder {
    stateful::<ButtonState>()
        .w_full()
        .h(54.0)
        .rounded(Theme::radius_md())
        .flex_center()
        .on_state(move |_ctx| {
            let bg = match _ctx.state() {
                ButtonState::Hovered => Color::rgba(0.15, 0.15, 0.15, 1.0),
                ButtonState::Pressed => Color::rgba(0.25, 0.25, 0.25, 1.0),
                _ => theme.accent,
            };
            div()
                .w_full().h_full()
                .rounded(Theme::radius_md())
                .bg(bg)
                .flex_center()
                .child(
                    text(label)
                        .size(16.0)
                        .weight(FontWeight::Bold)
                        .color(theme.bg_primary)
                )
        })
        .on_click(move |_| on_press())
}

pub fn secondary_button(
    label: &'static str,
    theme: Theme,
    on_press: impl Fn() + Send + Sync + 'static,
) -> impl ElementBuilder {
    stateful::<ButtonState>()
        .w_full()
        .h(54.0)
        .rounded(Theme::radius_md())
        .border(1.5, theme.border_strong)
        .flex_center()
        .on_click(move |_| on_press())
        .child(
            text(label)
                .size(16.0)
                .weight(FontWeight::SemiBold)
                .color(theme.text_primary)
        )
}

pub fn icon_button(
    icon_char: &'static str,
    theme: Theme,
    on_press: impl Fn() + Send + Sync + 'static,
) -> impl ElementBuilder {
    stateful::<ButtonState>()
        .square(40.0)
        .rounded(Theme::radius_md())
        .bg(theme.bg_card)
        .flex_center()
        .on_click(move |_| on_press())
        .child(text(icon_char).size(18.0).color(theme.text_primary))
}
