# StockFair

> **The stokvel app built for the people who built the stokvel.**  
> Transparent. Trustworthy. Proudly South African.

---

## What is StockFair?

Stokvels move over **R50 billion** through South African communities every year — mostly through WhatsApp groups, handwritten books, and trust. Banks have only captured about R12 billion of that. The rest runs on faith alone.

StockFair is a digital-first stokvel management platform that brings transparency, accountability, and collective buying power to every group — without replacing the human trust that makes stokvels work in the first place.

Built for the mamas. Built for the circles. Built for South Africa.

---

## Features

### Home Dashboard
- Live total savings across all your stokvels
- Balance, group count, and next payout at a glance
- Quick-access Deposit & Withdraw
- Stokvel cards with real-time contribution progress and overdue alerts

### Groups
- Manage multiple stokvels — Grocery, Rotating, Burial Society, Investment
- Per-group progress bars showing collection towards payout
- Member contribution tracking (Paid / Pending / Overdue)
- Group Pot with target and payout date
- Rules, History, and Group Cart tabs per stokvel

### Market
- Bulk grocery deals from Shoprite, Pick n Pay, Checkers, and Spar
- Category filters: Staples, Oils, Canned Goods, Cleaning, and more
- Pre-order with minimum quantity thresholds
- Retailer discount badges on every product

### Messages & Chat
- Group chat per stokvel
- Voice note support (critical for accessibility)
- **Inline Pre-order Vote cards** — propose a bulk order, vote directly in chat
  - Item breakdown, total cost, votes needed, live progress
  - Vote Yes / No without leaving the conversation

### Discover
- Location-based stokvel discovery (Johannesburg, GP · 10km radius)
- Featured stokvels with Fair Score ratings
- Filter by: For You, Top Performers, Safest
- Join or Request to Join open groups
- Stokvel types: Rotation, Investment, Grocery Co-op

### Fair Score
- Transparent trustworthiness rating (300–850 range)
- Calculated from: Payment History (40%), Consistency (25%), Group Activity (20%), Member Tenure (15%)
- Score tiers: Building → Fair → Good → Very Good → Excellent
- Tier unlocks: priority payouts, lower fees, investment stokvels, admin tools
- Platform comparison — see how you rank among all StockFair members
- Quick actions to boost your score

### Investment Portfolio
- Investment stokvels with Money Market Fund allocation
- Performance timeline vs bank returns
- Net returns, average rate p.a.
- **SARS Tax Report** — estimated interest, tax-free exemption status
- Full portfolio allocation donut chart

### Wallet
- Balance, money in/out summary
- Send, Request, Deposit, Withdraw
- Auto-Pay contributions setup
- Transaction history filtered by: This Week / This Month / All Time
- Category filters: All, Contributions, Payouts, Transfers

### Notifications
- Contribution due reminders
- Payout processed alerts
- New bulk deal alerts from retail partners
- New member joins
- Payment confirmations

### Security
**Feature Lock**
- PIN protection per action: Withdraw Funds, Stokvel Payments, View Statements, Linked Accounts, Investment Actions

**Fraud Shield** (all opt-in)
- Behavioral Analytics — flags unusual activity patterns
- SIM Swap Detection — monitors for SIM card porting (the #1 SA telecom fraud vector)
- Jailbreak & Root Detection — protects against compromised devices
- Geofencing & Velocity Checks — flags physically impossible transaction locations
- Full data transparency on every feature

### Language Support
StockFair is built to meet members where they are — in their language.
- **English** (default)
- **Tsonga** (Xitsonga) — first-class support, culturally reviewed
- **Sotho** (Sesotho)
- **Zulu** (isiZulu)
- More languages coming

### Themes
Three complete themes, each with light and dark modes:
- **Obsidian** — monochrome, clean, minimal
- **Forge** — amber gold, warm, community-rooted
- **Bloom** — fuchsia, bold, expressive

---

## Stokvel Constitution

Every group on StockFair is governed by a digitally-signed constitution — NASASA-aligned and built into the onboarding flow. Key provisions:

- FICA-compliant identity verification (SA ID / Passport + proof of residence)
- Elected executive committee: Chairperson, Secretary, Treasurer
- **Multi-Sig Rule**: Group fund withdrawals require approval from at least two office bearers
- Late payment fines configurable per group
- 30-day exit notice with clean balance settlement
- Two-thirds majority required to expel a member
- StockFair ledger is the canonical source of truth for all disputes
- Available in all supported languages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) |
| Backend | Rust (Axum) |
| Database | PostgreSQL |
| Cache | Redis |
| Payments | Ukheshe (with trait-based abstraction for future providers) |
| Auth | FICA/CDD KYC pipeline |

---

## Why StockFair?

| Problem | StockFair Solution |
|---------|-------------------|
| Money disappears, no accountability | Real-time ledger visible to all members |
| Admins have unchecked power | Multi-sig withdrawals, transparent Fair Score |
| No proof of contribution history | Immutable transaction records |
| Bulk buying is manual and disorganized | Market tab with retailer partnerships and group cart |
| Language barriers lock people out | Native support for Tsonga, Sotho, Zulu |
| SIM swap fraud wipes savings | Built-in Fraud Shield with SIM Swap Detection |
| No way to grow stokvel money | Investment stokvels with Money Market Funds and SARS reporting |

---

## Market Opportunity

- **800,000+** active stokvel groups in South Africa
- **R50 billion+** total annual stokvel economy
- **~R38 billion** currently unserved by any digital platform
- Majority of members are women in LSM 4–7
- Grocery stokvels are the largest and fastest-growing segment

---

## Roadmap

- [ ] Live payment integration (Ukheshe)
- [ ] Full multi-language rollout (Tsonga, Sotho, Zulu)
- [ ] Shoprite / Pick n Pay / Checkers API partnerships
- [ ] Investment stokvel regulatory compliance (FSP licensing)
- [ ] Biometric authentication
- [ ] WhatsApp-based contribution reminders

---

## Contact

- 📧 support@stockfair.co.za  
- 💬 WhatsApp: 0860 STOCKFAIR  

---

> *StockFair does not sell or share your data with third parties. All fraud detection features are opt-in. Investment returns are estimates based on historical averages. Past performance does not guarantee future results. Not financial advice.*

---

Built with 💛 in Johannesburg, South Africa.
