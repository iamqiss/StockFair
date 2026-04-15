//! Fair Score gradient bar — used on Profile screen.

use blinc_app::prelude::*;
use crate::theme::Theme;

pub fn fair_score_bar(score: u32, theme: Theme) -> impl ElementBuilder {
    let pct = (score as f32 - 300.0) / (850.0 - 300.0);
    let label = match score {
        0..=399   => "Building",
        400..=499 => "Fair",
        500..=619 => "Good",
        620..=719 => "Very Good",
        _         => "Excellent",
    };
    let color = match score {
        0..=399   => Color::rgba(0.898, 0.243, 0.243, 1.0),
        400..=499 => Color::rgba(1.0, 0.749, 0.0, 1.0),
        500..=619 => Color::rgba(0.247, 0.494, 0.996, 1.0),
        _         => Color::rgba(0.086, 0.639, 0.239, 1.0),
    };

    div()
        .w_full()
        .flex_col()
        .gap(Theme::sp(2.0))
        .child(
            div()
                .flex_row()
                .justify_between()
                .items_center()
                .child(text(&format!("{}", score)).size(48.0).weight(FontWeight::Bold).color(theme.text_primary))
                .child(
                    div()
                        .px(Theme::sp(3.0))
                        .py(6.0)
                        .rounded(Theme::radius_full())
                        .bg(Color::rgba(
                            color.r, color.g, color.b, 0.15,
                        ))
                        .child(text(label).size(12.0).weight(FontWeight::SemiBold).color(color))
                )
        )
        .child(
            div()
                .w_full()
                .h(6.0)
                .rounded(Theme::radius_full())
                .bg(theme.border)
                .child(
                    div()
                        .w(pct * 100.0) // TODO: percentage width
                        .h_full()
                        .rounded(Theme::radius_full())
                        .bg(color)
                )
        )
        .child(
            div()
                .flex_row()
                .justify_between()
                .child(text("Poor").size(10.0).color(theme.text_muted))
                .child(text("Excellent").size(10.0).color(theme.text_muted))
        )
}
