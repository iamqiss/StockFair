//! Stokvel detail screen — TODO: implement

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;

pub fn stokvel_detail_screen(ctx: &WindowedContext, id: &str) -> impl ElementBuilder {
    div()
        .w_full()
        .h_full()
        .flex_center()
        .child(
            text(&format!("Stokvel: {}", id))
                .size(20.0)
                .color(Color::WHITE)
        )
}
