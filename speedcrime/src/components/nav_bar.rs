//! Bottom navigation bar — Home, Groups, Discover, Market, Profile.

use blinc_app::prelude::*;
use blinc_layout::stateful::stateful;
use crate::state::app::{AppState, Route};
use crate::theme::Theme;

pub fn nav_bar(ctx: &blinc_app::windowed::WindowedContext) -> impl ElementBuilder {
    let app_state = ctx.use_state_keyed("app_state", AppState::default);

    stateful::<NoState>()
        .deps([app_state.signal_id()])
        .on_state(move |_ctx| {
            let state = app_state.get();
            let theme = state.theme();
            let route = state.current_route.clone();

            div()
                .w_full()
                .h(80.0)
                .bg(theme.nav_bg)
                .flex_row()
                .justify_evenly()
                .items_center()
                .child(nav_item(_ctx, "Home",     Route::Home,     route == Route::Home,     app_state.clone(), theme.clone()))
                .child(nav_item(_ctx, "Groups",   Route::Groups,   route == Route::Groups,   app_state.clone(), theme.clone()))
                .child(nav_item(_ctx, "Discover", Route::Discover, route == Route::Discover, app_state.clone(), theme.clone()))
                .child(nav_item(_ctx, "Market",   Route::Market,   route == Route::Market,   app_state.clone(), theme.clone()))
                .child(nav_item(_ctx, "Profile",  Route::Profile,  route == Route::Profile,  app_state.clone(), theme.clone()))
        })
}

fn nav_item(
    ctx: &blinc_app::windowed::WindowedContext,
    label: &'static str,
    route: Route,
    is_active: bool,
    app_state: blinc_app::State<AppState>,
    theme: crate::theme::Theme,
) -> impl ElementBuilder {
    let color = if is_active { theme.nav_active } else { theme.nav_inactive };

    stateful::<ButtonState>()
        .flex_col()
        .items_center()
        .gap(4.0)
        .px(Theme::sp(3.0))
        .py(Theme::sp(2.0))
        .on_click(move |_| {
            app_state.update(|mut s| { s.current_route = route.clone(); s });
        })
        .child(
            div()
                .square(if is_active { 6.0 } else { 0.0 })
                .rounded(Theme::radius_full())
                .bg(theme.accent)
        )
        .child(text(label).size(10.0).weight(FontWeight::SemiBold).color(color))
}
