<div align="center">

<img src="logo.png" alt="chipin logo"/>

# chipin

**Community savings, reimagined for the world.**

*Every culture has a name for it. Now there's one app.*

<br/>

[![Build](https://img.shields.io/github/actions/workflow/status/iamqiss/chipin/ci.yml?branch=main&style=flat-square&color=00C896&label=build)](https://github.com/iamqiss/chipin)
[![Backend](https://img.shields.io/badge/motherlode-Rust%20%2B%20Axum-orange?style=flat-square&logo=rust)](https://github.com/iamqiss/chipin/tree/main/motherlode)
[![Frontend](https://img.shields.io/badge/speedcrime-Blinc%20%2B%20GPU-blueviolet?style=flat-square)](https://github.com/iamqiss/chipin/tree/main/speedcrime)
[![Protocol](https://img.shields.io/badge/transport-gRPC%20%2B%20Protobuf-4285F4?style=flat-square&logo=google)](https://github.com/iamqiss/chipin/tree/main/proto)
[![License](https://img.shields.io/badge/license-MIT-00C896?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/status-active%20development-yellow?style=flat-square)]()
[![Made in](https://img.shields.io/badge/made%20in-Johannesburg%20🇿🇦-green?style=flat-square)]()

<br/>

---

</div>

## What is chipin?

Around the world, communities have always pooled their money together. In South Africa it's a **stokvel**. In Mexico, a **tanda**. In India, a **chit fund**. In Egypt, a **gameya**. In West Africa, a **susu**. In China, a **hui**.

The practice is ancient and universal — but the software has never caught up.

**chipin** is the infrastructure that was always missing: a community savings platform where groups contribute together, idle funds earn yield through DeFi, payouts happen in local currency, and none of the financial complexity is visible to the user. It works the same way whether you're in Johannesburg, Mexico City, Mumbai, or Cairo.

---

## The Vision

```
User chips in  →  Pool earns DeFi yield  →  chipscore tracks behavior
      ↓                                              ↓
Local currency payout              Best scorers unlock real lending
      ↓                                              ↓
Seamless experience              Home finance. Car finance. Fair rates.
```

chipin is building toward a commercial banking license — not to become another bank, but to give people who traditional banks have always ignored a genuine path to credit. **chipscore** doesn't care how much you earn. It cares how consistent you are.

---

## The Stack

chipin is built entirely in Rust — not as a philosophical choice, but because real-time financial systems demand it.

| Layer | Technology | Purpose |
|---|---|---|
| **motherlode** | Rust · Axum · tonic | Backend API + gRPC server |
| **speedcrime** | Rust · Blinc · wgpu | GPU-accelerated native frontend |
| **transport** | gRPC + Protobuf | Type-safe binary communication |
| **database** | PostgreSQL · Supabase | Persistent storage |
| **cache** | Redis · Upstash | OTP, sessions, rate limiting |
| **payments** | Ukheshe → Internal FSP | Payment provider (swappable) |
| **DeFi** | USDC · Yield protocol | Parent currency + pool yield |
| **mobile** | Android · iOS · WASM | Cross-platform via Blinc |

---

## Feature Status

### Core

| Feature | Status |
|---|---|
| Multi-step registration + FICA compliance | ✅ Complete |
| Phone OTP via SMS + WhatsApp | ✅ Complete |
| JWT auth with token rotation | ✅ Complete |
| Fraud Shield (SIM swap, geofencing, behavioral) | ✅ Designed |
| Feature lock (PIN-gated actions) | ✅ Designed |
| gRPC + Protobuf transport layer | ✅ Scaffolded |
| Database migrations (10 tables) | ✅ Live on Supabase |

### Groups & Contributions

| Feature | Status |
|---|---|
| Create / join groups | 🔨 In progress |
| Member roles (Chairperson, Secretary, Treasurer) | 🔨 In progress |
| Multi-sig withdrawals (2-of-N approval) | 🔨 In progress |
| Real-time contribution tracking | 🔨 In progress |
| Auto-pay contributions | 📋 Planned |
| Payout scheduler | 📋 Planned |

### Market (Bulk Buying)

| Feature | Status |
|---|---|
| Retailer partnerships (Shoprite, Pick n Pay, Checkers) | 📋 Planned |
| Group pre-order with in-chat voting | 📋 Planned |
| Collection codes for grocery pickup | 📋 Planned |
| Bulk deal notifications | 📋 Planned |

### chipscore

| Feature | Status |
|---|---|
| Score algorithm (behavior + consistency) | 🔨 In progress |
| Score history + breakdown | 🔨 In progress |
| Tier unlocks (Building → Fair → Good → Very Good → Excellent) | 📋 Planned |
| Platform comparison | 📋 Planned |
| Credit unlock via chipscore | 🔭 Future (post-FSP license) |

### DeFi & Global Expansion

| Feature | Status |
|---|---|
| USDC as internal settlement currency | 🔭 Future |
| DeFi yield on pool funds | 🔭 Future |
| Multi-currency local payout | 🔭 Future |
| Cross-border groups | 🔭 Future |
| FSP / Commercial banking license | 🔭 Future |

---

## Languages

chipin is built to meet users in their language — not as an afterthought.

| Language | Status |
|---|---|
| English | ✅ Complete |
| Xitsonga | ✅ Culturally reviewed (first-class) |
| Sesotho | 🔨 In progress |
| isiZulu | 🔨 In progress |
| isiXhosa | 📋 Planned |
| Afrikaans | 📋 Planned |
| Setswana | 📋 Planned |
| siSwati · Tshivenda · Sepedi · isiNdebele | 📋 Planned |
| Spanish · Hindi · Arabic | 🔭 Future (global expansion) |

> **Why Xitsonga first?** chipin was born in Giyani, Limpopo. Xitsonga is underrepresented in SA tech. Leading with it is a cultural statement — and it's the language of our first users.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        speedcrime                           │
│              Blinc · GPU-accelerated · cross-platform       │
│          Android  ·  iOS  ·  Desktop  ·  WASM               │
└──────────────────────┬──────────────────────────────────────┘
                       │
              gRPC :50051 (native)
              gRPC-Web :50052 (WASM)
              Protobuf binary
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                        motherlode                           │
│            Rust · Axum · tonic · sqlx · Redis               │
├───────────────┬───────────────┬────────────────────────────┤
│  Auth + OTP   │ Groups + Wallet│ Market + DeFi             │
│  chipscore    │ Contributions  │ Fraud Shield               │
└───────────────┴───────┬───────┴────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
    PostgreSQL        Redis        Payment
    (Supabase)      (Upstash)     Provider
                                 (Ukheshe →
                                  Internal FSP)
```

---

## The chipscore Manifesto

Traditional credit scoring is broken. It rewards people who already have money and punishes those who don't.

**chipscore works differently:**

- It measures **consistency**, not wealth
- It tracks **behavior** over time — minimum 12 months to build a meaningful score
- It rewards **showing up** for your circle, every month, without fail
- It never rewards taking on debt you don't need
- It starts at **380 for everyone** — no head start for the wealthy

When chipin eventually offers home and car finance, the best rates go to the most consistent people — regardless of their salary.

---

## Why Rust?

chipin handles real money in real-time across groups of people who trust each other. There is no room for runtime errors, memory unsafety, or race conditions.

- **motherlode** — every database query is compile-time verified via sqlx macros
- **speedcrime** — GPU-rendered UI with zero garbage collection pauses
- **gRPC + Protobuf** — mathematical impossibility of type mismatches at the transport layer
- **Payment abstraction** — swappable via a Rust trait, one env var to switch providers

The most catastrophic category of fintech failures — bad data types, null pointer exceptions, race conditions in concurrent transactions — cannot compile in chipin.

---

## Getting Started

```bash
# Prerequisites
cargo install sqlx-cli --no-default-features --features postgres
sudo apt install -y protobuf-compiler

# Clone
git clone https://github.com/iamqiss/chipin
cd chipin

# Backend (motherlode)
cd motherlode
cp .env.example .env     # fill in Supabase + Redis URLs
sqlx migrate run
cargo run

# Frontend (speedcrime)
cd ../speedcrime
cp .env.example .env     # set MOTHERLODE_GRPC_URL
cargo run
```

---

## Repository Structure

```
chipin/
├── proto/               # Protobuf definitions (source of truth)
│   ├── common.proto
│   ├── auth.proto
│   ├── stokvels.proto
│   ├── wallet.proto
│   ├── market.proto
│   ├── fair_score.proto
│   ├── messages.proto
│   └── fraud.proto
│
├── motherlode/          # Rust backend
│   ├── src/
│   │   ├── routes/      # HTTP + gRPC routing
│   │   ├── handlers/    # Request / response
│   │   ├── services/    # Business logic
│   │   ├── repositories/# Database queries
│   │   ├── grpc/        # tonic gRPC server
│   │   ├── payments/    # Provider abstraction
│   │   ├── notifications/# SMS, WhatsApp, FCM
│   │   └── jobs/        # Background tasks
│   └── migrations/      # 10 SQL migrations (live)
│
├── speedcrime/          # Rust native frontend
│   ├── src/
│   │   ├── app/         # Screens
│   │   ├── components/  # UI components
│   │   ├── grpc/        # tonic client
│   │   ├── i18n/        # 11 SA languages
│   │   ├── state/       # App + auth state
│   │   └── theme/       # Obsidian · Forge · Bloom
│   └── assets/          # Fonts, icons, images
│
└── docs/                # Logo, screenshots, architecture
```

---

## Status Legend

| Badge | Meaning |
|---|---|
| ✅ Complete | Built, tested, working |
| 🔨 In progress | Actively being built |
| 📋 Planned | Designed, not yet built |
| 🔭 Future | Post-launch roadmap |

---

<div align="center">

**chipin** is being built by a 22-year-old self-taught developer from Giyani, Limpopo.

<br/>

*For the mamas who run stokvels in WhatsApp groups.*
*For the circles that keep families fed.*
*For everyone the banks said no to.*

<br/>

---

Built with 💚 in Johannesburg, South Africa

[support@chipin.app](mailto:support@chipin.app) · [chipin.app](https://chipin.app)

</div>
 
