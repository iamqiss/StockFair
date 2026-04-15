//! Root view — mounts global state and routes to the correct screen.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;

use crate::state::app::{AppState, Route};
use crate::router::route_to_screen;

pub fn root_view(ctx: &WindowedContext) -> impl ElementBuilder {
    // Global app state
    let app_state = ctx.use_state_keyed("app_state", AppState::default);
    let theme = app_state.get().theme();

    div()
        .w(ctx.width)
        .h(ctx.height)
        .bg(theme.bg_primary)
        .child(
            stateful::<NoState>()
                .deps([app_state.signal_id()])
                .on_state(move |_ctx| {
                    let state   = app_state.get();
                    let theme   = state.theme();
                    let route   = state.current_route.clone();
                    div()
                        .w_full()
                        .h_full()
                        .bg(theme.bg_primary)
                        .child(route_to_screen(_ctx, route))
                })
        )
}
