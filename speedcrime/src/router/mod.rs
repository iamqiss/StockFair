//! Client-side router — maps Route enum to screen components.

use blinc_app::prelude::*;
use blinc_app::windowed::WindowedContext;
use blinc_layout::stateful::stateful;

use crate::state::app::Route;

pub fn route_to_screen(
    ctx: &WindowedContext,
    route: Route,
) -> impl ElementBuilder {
    match route {
        Route::Welcome            => crate::app::screens::welcome::welcome_screen(ctx),
        Route::Login              => crate::app::screens::login::login_screen(ctx),
        Route::Register           => crate::app::screens::register::register_screen(ctx),
        Route::Home               => crate::app::screens::home::home_screen(ctx),
        Route::Groups             => crate::app::screens::groups::groups_screen(ctx),
        Route::Discover           => crate::app::screens::discover::discover_screen(ctx),
        Route::Market             => crate::app::screens::market::market_screen(ctx),
        Route::Profile            => crate::app::screens::profile::profile_screen(ctx),
        Route::FairScore          => crate::app::screens::fair_score::fair_score_screen(ctx),
        Route::Wallet             => crate::app::screens::wallet::wallet_screen(ctx),
        Route::Notifications      => crate::app::screens::notifications::notifications_screen(ctx),
        Route::StokvelDetail(id)  => crate::app::screens::stokvel_detail::stokvel_detail_screen(ctx, &id),
        Route::Messages(id)       => crate::app::screens::messages::messages_screen(ctx, &id),
        Route::Portfolio          => crate::app::screens::portfolio::portfolio_screen(ctx),
    }
}
