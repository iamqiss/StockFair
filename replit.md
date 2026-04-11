# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### StockFair (`artifacts/stockfair`)
- **Type**: Expo mobile app
- **Purpose**: South African stokvel (savings group) app with marketplace
- **Color Palette**: Full monochrome — pure black/white. Light mode: white bg, black text. Dark mode: pure black bg, white text. Green (#16A34A) for success/paid only.
- **Languages**: All 11 official South African languages supported (EN, ZU, XH, AF, NS, ST, TN, VE, TS, SS, NR)
- **Key Features**:
  - Stokvel group management (rotation, burial, investment, grocery, social types)
  - Multi-step group creation (expanded investment flow: vehicle selection, fee disclosure, tax education)
  - Investment stokvels: Money Market Fund (7–9%), Property Stokvel (8–14%), JSE Top 40 ETF (10–15%)
  - Platform fees: 0.5–1% of returns only (never principal) — fully transparent
  - Investment Dashboard: portfolio value, return vs bank benchmark, earnings to date, platform fee breakdown
  - SARS Tax Report: per-member interest certificates, R23,800 exemption tracking, ITR12-ready, shareable
  - Marketplace with bulk deals from SA retailers (Shoprite, Pick n Pay, Spar, Checkers, Woolworths)
  - In-app transactions and contributions
  - Multi-language support with language picker
  - First-class messaging hub with voice notes
  - Multi-step registration (Personal, Contact, Language, Stokvel Preferences)
  - 3-step KYC (Identity + ID, Proof of Address, Selfie + Consent)
  - Fair Score system
  - User profile and achievements
  - **Smart/context-aware groups**: Groups screen shows urgency-sorted stokvel list (nearest payout first) + Smart Insight Card (monthly commitment, urgent action with red warning ≤7 days, estimated investment return across all funds)
  - **GroupContextBanner**: Horizontally scrollable context chips on stokvel detail screen between actions and tabs — type-specific (rotation: payout countdown + your position; burial: coverage amount + status; investment: return range + vehicle + est. gain; grocery: vote status + order date; social: next event date)
  - **ConstitutionModal**: Full investment props (vehicle, desc, fees, return range), real signed date from AsyncStorage, real member name from `useAuth`, Share button
  - **PaymentModal** (`components/PaymentModal.tsx`): Wallet vs EFT method selection, wallet balance check, FNB EFT bank details, 4-digit PIN keypad with shake animation + attempt limiting, success receipt with reference number
  - **BurialClaimModal** (`components/BurialClaimModal.tsx`): 3-step flow (incident details + relationship/coverage selector → document checklist → review + processing timeline → success + claim ref); relationship types with tiered coverage (100%/75%/50%/25%); claimable amount calculated live; "File Claim" icon button on burial stokvel detail action bar
  - **Activity Feed** (home screen): Smart feed generator from stokvels — payment due alerts (amber/red), payout received events (green), member joins, investment milestones, burial policy updates, votes; urgent items displayed in banner cards above feed; time labels; show/hide expand
  - **Fair Score card** (home screen): Derived from stokvel count + member activity; 300–850 scale; color bands (Excellent/Good/Fair/Building); progress bar
  - **Discover tab** (`app/(tabs)/discover.tsx`) — dedicated center nav tab with compass icon:
    - 10 richly detailed stokvels (real SA locations, Fair Scores, return rates, member caps, highlights)
    - 5 smart filter chips: **For You** (algorithm personalised), **Top Performers** (Fair Score 750+ or returns >9%), **Safest** (track record + low risk), **Highest Grossing** (biggest pools), **Near Me** (within radius)
    - **Featured hero carousel** — 3 big swipeable cards with accent color theming, stats, capacity bar, join CTA; dot-page indicator
    - **Search bar** — live filter by stokvel name or location
    - **Rich list cards** — icon, name, verified badge, distance, location, Fair Score pill, capacity progress bar, type badge, urgency badge ("2 spots left"), Return rate for investment type, request-to-join button
    - **"Create" teaser CTA** at bottom linking to Groups tab
    - Groups tab retains a "Discover Stokvels" teaser banner that navigates to the Discover tab
  - **Growth Projector** (`invest.tsx ProjectionCalculator`): 5 time horizons (6M/1Y/2Y/3Y/5Y) with interactive bar chart, per-horizon breakdown of new contributions / projected pool / net returns / vs bank / your share; fees deducted from returns only
  - **Portfolio Overview** (`app/portfolio/index.tsx`): Aggregated view across all investment stokvels — total portfolio value, donut allocation chart by vehicle type, performance timeline (SVG line chart vs bank savings), tax threshold summary, per-stokvel cards with quick stats, navigation to individual dashboards and tax reports
  - **Performance Chart** (`components/PerformanceChart.tsx`): SVG line chart with smooth Bezier curves, interactive data points with haptic feedback, gradient fill, bank savings comparison line, monthly labels
  - **Donut Chart** (`components/DonutChart.tsx`): Interactive SVG donut chart with tap-to-select slices, center label showing total or selected slice, legend with percentages and values
  - **Fair Score Deep Dive** (`app/fairscore/index.tsx`): Full-screen Fair Score analysis — animated gradient arc gauge (300–850), tier badge, progress to next tier, 12-month score history SVG line chart with growth stats, expandable factor deep-dive cards (Payment History 40%/Consistency 25%/Group Activity 20%/Tenure 15%) with per-factor insights and improvement tips, tier unlocks system showing what each level unlocks, platform comparison with percentile ranking, quick action buttons to boost score; accessible from Home and Profile FairScoreCards
  - **In-App Payments System**:
    - **Wallet Hub** (`app/(tabs)/transactions.tsx`): Enhanced transactions tab serving as full wallet hub — balance summary, In/Out totals, 4 quick actions (Send/Request/Deposit/Withdraw), pending payment requests with Pay/Decline, Auto-Pay link, transaction filters (transfers type added)
    - **SendMoneyModal** (`components/SendMoneyModal.tsx`): P2P transfer flow — member search/select → amount entry with quick chips → confirm with fee breakdown → PIN verification with shake animation → success receipt with reference number; deduplicates members across stokvels
    - **RequestPaymentModal** (`components/RequestPaymentModal.tsx`): Payment request flow — member search/select → amount + reason → confirm → sent notification; pending requests appear on wallet hub with Pay/Decline buttons
    - **Auto-Pay** (`app/payments/autopay.tsx`): Full auto-pay management — master enable/disable toggle, per-stokvel toggle, payment method selection (Wallet/EFT), schedule display, low balance warning, total scheduled amount display; persisted to `@stockfair_autopay`
    - **StokvelContext extended**: `sendFunds()` for P2P transfers with reference generation; `paymentRequests` state with `addPaymentRequest()`/`respondToRequest()` for request flows; Transaction type expanded with `transfer`/`request`/`credit`/`debit` types + optional `recipientName`/`senderId`/`reference`/`note` fields; persisted to `@stockfair_payment_requests`
  - **Home → Portfolio Card**: Dark gradient card on home screen linking to portfolio overview (only shown if user has investment stokvels)
  - **Three color palettes** — `constants/colors.ts`, `context/ThemeContext.tsx`, `hooks/useColors.ts`:
    - **Obsidian**: Pure monochrome (existing light + dark variants)
    - **Forge**: Steel-black background (`#080C12`) + amber/gold primary (`#F59E0B`) + cold steel blue accents — masculine, industrial
    - **Bloom**: Deep plum-black background (`#0C0814`) + vivid fuchsia primary (`#D946EF`) + soft rose accent (`#F9A8D4`) — bold, feminine
    - `ThemeContext` extended with `palette: ColorPalette` + `setPalette()`; stored in `@stockfair_palette`
    - All 3 palettes have full light + dark variants: `obsidianLight`, `obsidianDark`, `forgeLight`, `forgeDark`, `bloomLight`, `bloomDark`
    - Forge Light: warm honey cream `#FBF7F1` bg + amber ink `#B8701E`; Bloom Light: soft lavender `#F0EBF8` + deep fuchsia `#8820A8`
    - Profile Appearance: 3 swatch cards + brightness toggle (Follow System / Light / Dark) now shown for ALL palettes
    - Profile hero quick-toggle button cycles through all 3 palettes; hero gradient adapts per palette AND per light/dark
    - Tab bar fully theme-aware: background, active icon, inactive icon all follow palette+brightness

### API Server (`artifacts/api-server`)
- Express 5 + TypeScript
- PostgreSQL + Drizzle ORM

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
