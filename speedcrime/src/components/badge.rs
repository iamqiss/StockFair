//! Status badges — Active, Pending, Overdue, Paid.

use blinc_app::prelude::*;
use crate::theme::Theme;

pub enum BadgeVariant {
    Active,
    Pending,
    Overdue,
    Paid,
    Custom(Color, Color),
}

pub fn badge(label: &str, variant: BadgeVariant) -> impl ElementBuilder {
    let (bg, fg) = match variant {
        BadgeVariant::Active          => (Color::rgba(0.086, 0.639, 0.239, 0.15), Color::rgba(0.086, 0.639, 0.239, 1.0)),
        BadgeVariant::Pending         => (Color::rgba(1.0, 0.749, 0.0, 0.15),     Color::rgba(1.0, 0.749, 0.0, 1.0)),
        BadgeVariant::Overdue         => (Color::rgba(0.898, 0.243, 0.243, 0.15), Color::rgba(0.898, 0.243, 0.243, 1.0)),
        BadgeVariant::Paid            => (Color::rgba(0.086, 0.639, 0.239, 0.15), Color::rgba(0.086, 0.639, 0.239, 1.0)),
        BadgeVariant::Custom(b, f)    => (b, f),
    };

    div()
        .px(Theme::sp(3.0))
        .py(4.0)
        .rounded(Theme::radius_full())
        .bg(bg)
        .child(text(label).size(11.0).weight(FontWeight::SemiBold).color(fg))
}
