//! Stokvel card component — used in Groups and Home screens.

use blinc_app::prelude::*;
use crate::state::stokvels::{Stokvel, StokvelType};
use crate::theme::Theme;
use crate::components::badge::{badge, BadgeVariant};

pub fn stokvel_card(stokvel: &Stokvel, theme: Theme) -> impl ElementBuilder {
    let accent = match stokvel.stokvel_type {
        StokvelType::Grocery    => theme.accent_warm,
        StokvelType::Investment => theme.info,
        StokvelType::Burial     => theme.text_secondary,
        _                       => theme.accent,
    };

    div()
        .w_full()
        .rounded(Theme::radius_xl())
        .overflow_clip()
        .flex_col()
        // Coloured header strip
        .child(
            div()
                .w_full()
                .h(60.0)
                .bg(accent)
                .flex_row()
                .items_center()
                .justify_between()
                .px(Theme::sp(4.0))
                .child(
                    div()
                        .flex_col()
                        .child(text(&stokvel.name).size(16.0).weight(FontWeight::Bold).color(Color::WHITE))
                        .child(text(stokvel.stokvel_type.label()).size(11.0).color(Color::rgba(1.0,1.0,1.0,0.7)))
                )
                .child(badge("Active", BadgeVariant::Active))
        )
        // Stats row
        .child(
            div()
                .w_full()
                .bg(theme.bg_card)
                .px(Theme::sp(4.0))
                .py(Theme::sp(4.0))
                .flex_row()
                .justify_between()
                .child(stat_col(&format!("R {:.0}", stokvel.total_savings), "Total Savings", theme.clone()))
                .child(stat_col(&format!("{}", stokvel.member_count), "Members", theme.clone()))
                .child(stat_col(&format!("R {:.0}/mo", stokvel.contribution_amount), "Monthly", theme.clone()))
        )
        // Progress bar
        .child(
            div()
                .w_full()
                .h(4.0)
                .bg(theme.border)
                .child(
                    div()
                        .w((stokvel.progress_pct as f32 / 100.0) * 100.0) // TODO: relative width
                        .h_full()
                        .bg(accent)
                )
        )
}

fn stat_col(value: &str, label: &str, theme: Theme) -> impl ElementBuilder {
    div()
        .flex_col()
        .items_center()
        .gap(2.0)
        .child(text(value).size(15.0).weight(FontWeight::Bold).color(theme.text_primary))
        .child(text(label).size(10.0).color(theme.text_muted))
}
