//! Messages screen — TODO: implement

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;

pub fn messages_screen(ctx: &WindowedContext, stokvel_id: &str) -> impl ElementBuilder {
    div()
        .w_full()
        .h_full()
        .flex_center()
        .child(
            text(&format!("Messages: {}", stokvel_id))
                .size(20.0)
                .color(Color::WHITE)
        )
}
