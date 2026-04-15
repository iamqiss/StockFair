//! Portfolio screen — TODO: implement

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;

pub fn portfolio_screen(ctx: &WindowedContext) -> impl ElementBuilder {
    div()
        .w_full()
        .h_full()
        .flex_center()
        .child(
            text("Portfolio")
                .size(24.0)
                .weight(FontWeight::Bold)
                .color(Color::WHITE)
        )
}
