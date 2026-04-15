//! Text input component.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;
use crate::theme::Theme;

pub fn text_input(
    ctx: &WindowedContext,
    key: &'static str,
    placeholder: &'static str,
    value: blinc_app::State<String>,
    theme: Theme,
) -> impl ElementBuilder {
    div()
        .w_full()
        .flex_col()
        .gap(6.0)
        .child(
            text(placeholder.to_uppercase().as_str())
                .size(11.0)
                .weight(FontWeight::Bold)
                .color(theme.text_muted)
                .letter_spacing(0.6)
        )
        .child(
            // TODO: replace with blinc text_field element when available
            // For now: styled div placeholder
            div()
                .w_full()
                .h(54.0)
                .rounded(Theme::radius_md())
                .bg(theme.bg_secondary)
                .border(1.5, theme.border)
                .px(Theme::sp(3.5))
                .flex_row()
                .items_center()
                .child(
                    stateful::<NoState>()
                        .deps([value.signal_id()])
                        .on_state(move |_ctx| {
                            let v = value.get();
                            if v.is_empty() {
                                text(placeholder).size(15.0).color(theme.text_muted)
                            } else {
                                text(&v).size(15.0).color(theme.text_primary)
                            }
                        })
                )
        )
}
