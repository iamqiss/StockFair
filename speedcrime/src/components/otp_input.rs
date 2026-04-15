//! 6-box OTP input component.

use blinc_app::prelude::*;
use blinc_layout::stateful::stateful;
use crate::theme::Theme;

pub fn otp_input(
    value: blinc_app::State<String>,
    theme: Theme,
) -> impl ElementBuilder {
    div()
        .w_full()
        .flex_row()
        .justify_center()
        .gap(Theme::sp(2.5))
        .child(
            stateful::<NoState>()
                .deps([value.signal_id()])
                .on_state(move |_ctx| {
                    let v = value.get();
                    let mut row = div().flex_row().gap(Theme::sp(2.5));
                    for i in 0..6usize {
                        let digit = v.chars().nth(i).map(|c| c.to_string()).unwrap_or_default();
                        let filled = !digit.is_empty();
                        row = row.child(
                            div()
                                .square(48.0)
                                .rounded(Theme::radius_md())
                                .bg(if filled { theme.bg_secondary } else { theme.bg_card })
                                .border(1.5, if filled { theme.border_strong } else { theme.border })
                                .flex_center()
                                .child(
                                    text(if filled { digit.as_str() } else { "" })
                                        .size(22.0)
                                        .weight(FontWeight::Bold)
                                        .color(theme.text_primary)
                                )
                        );
                    }
                    row
                })
        )
}
