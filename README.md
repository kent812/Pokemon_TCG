# ⚡ Pokémon TCG Browser

> Search, collect, and manage your Pokémon Trading Card Game collection — powered by the [Pokémon TCG API](https://pokemontcg.io).

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Pokémon TCG API](https://img.shields.io/badge/Pok%C3%A9mon%20TCG%20API-v2-EF5350?style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📸 Preview

```
┌─────────────────────────────────────────────────┐
│  ⚡ POKÉMON TCG BROWSER                  Logout  │
├─────────────────────────────────────────────────┤
│                                                 │
│        ⚡ POKÉMON TCG BROWSER ⚡                 │
│     Search, collect & compare cards             │
│   [ Search Pokémon name… ] [Search] [Browse]    │
│                                                 │
│  Type ▾  Rarity ▾  Sort ▾  ○ My Collection     │
│                                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │ Card │ │ Card │ │ Card │ │ Card │           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
└─────────────────────────────────────────────────┘
```

---

## ✨ Features

- 🔐 **User Authentication** — Sign up and log in with session persistence via `localStorage`
- 🔍 **Live Card Search** — Search any Pokémon name against the full TCG database
- 🎛️ **Advanced Filters** — Filter by Type, Rarity, and sort by Name / Power / Value / HP
- 📦 **Collection Manager** — Add and remove cards from your personal collection with one click
- ⚡ **Power Scoring** — Every card gets a computed power score based on HP, attacks, and rarity
- 💰 **Value Estimator** — Estimated market value calculated per card rarity and special variants
- 📊 **Live Stats Dashboard** — Cards shown, average power, total collected, and strongest card
- 🪟 **Card Detail Modal** — Full card view with large image, attacks list, and collection actions
- 🦴 **Skeleton Loaders** — Smooth loading states while API data is fetched
- 🔔 **Toast Notifications** — Success, warning, and error feedback on every action
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile

---

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari)
- A free API key from [pokemontcg.io](https://pokemontcg.io)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/pokemon-tcg-browser.git
   cd pokemon-tcg-browser
   ```

2. **Add your API key**

   Open `app.js` and replace the placeholder key:

   ```js
   // app.js — line 3
   const API_KEY = 'your-api-key-here';
   ```

3. **Open in browser**

   ```bash
   # No build step required — just open the file
   open index.html
   ```

   Or serve it locally with any static server:

   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```

---

## 🗂️ Project Structure

```
pokemon-tcg-browser/
├── index.html       # App shell — auth screen, navbar, all page sections
├── style.css        # Full design system — dark theme, components, responsive
├── app.js           # All logic — auth, API calls, rendering, state management
└── README.md
```

> The entire app is intentionally vanilla HTML/CSS/JS with zero dependencies or build tools.

---

## 🧠 How It Works

### Authentication

User accounts are stored in `localStorage` as a JSON array under the key `ptcg_users`. Sessions persist between browser refreshes automatically.

```
localStorage
├── ptcg_users   → [{ id, name, email, password, createdAt, logins }]
├── ptcg_user    → { ...currentUser }   (active session)
└── ptcg_coll    → { "cardId": true }   (collected card IDs)
```

> ⚠️ Passwords are currently stored in plain text. See the [Security](#-security-notes) section for recommendations.

### API Integration

All card data comes from the [Pokémon TCG API v2](https://docs.pokemontcg.io/).

| Action | Endpoint |
|---|---|
| Browse all cards | `GET /v2/cards?pageSize=100` |
| Search by name | `GET /v2/cards?q=name:{query}*&pageSize=100` |

Every API response is enriched with two computed fields:

```js
powerScore     = (HP × 0.5) + (attackDamage × 2) × rarityMultiplier
estimatedValue = baseRarityValue + (powerScore × 0.05) × variantMultiplier
```

### Power Score Formula

| Rarity | Multiplier |
|---|---|
| Common | ×1.0 |
| Uncommon | ×1.2 |
| Rare | ×1.5 |
| Rare Holo | ×2.0 |
| Rare Holo EX | ×3.0 |
| Rare Ultra | ×4.0 |

EX / GX / V / VMAX / VSTAR named cards receive an additional **×2 value bonus**.

---

## 🎛️ Filters & Sorting

| Filter | Options |
|---|---|
| **Type** | Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Colorless |
| **Rarity** | Common, Uncommon, Rare, Rare Holo, Rare Holo EX, Rare Ultra |
| **Sort** | Name (A–Z), Power (desc), Value (desc), HP (desc) |
| **My Collection** | Toggle to show only cards you've added |

> All filtering and sorting currently runs client-side on the fetched dataset.

---

## 📄 Pages

| Page | Route | Description |
|---|---|---|
| **Home** | `home` | Card browser with search, filters, stats, and grid |
| **About** | `about` | Feature overview and app description |
| **Contact** | `contact` | Contact form (simulated — no backend) |
| **Profile** | `profile` | Account info and collection summary stats |

---

## 🔒 Security Notes

This project is designed as a **client-side demo**. Before deploying publicly:

- **Hash passwords** using the Web Crypto API before storing in `localStorage`
- **Proxy API calls** through a backend to keep the API key out of client-side JavaScript
- **Replace localStorage auth** with a proper backend (e.g., Firebase Auth, Supabase, or a Node/Express server with JWT)

---

## 🗺️ Roadmap

- [ ] Server-side filtering via API query parameters (type, rarity, set)
- [ ] True API pagination using `page` + `pageSize` parameters
- [ ] Dynamic filter dropdowns from `/v2/types` and `/v2/rarities`
- [ ] Set browser using `/v2/sets`
- [ ] In-memory response cache with TTL
- [ ] Debounced real-time search input
- [ ] Collection export / import (JSON)
- [ ] Card comparison mode (up to 3 cards side-by-side)
- [ ] Backend auth with hashed passwords

---

## 🧩 API Reference

This project uses the **Pokémon TCG API v2** — full documentation at [docs.pokemontcg.io](https://docs.pokemontcg.io/).

Get a free API key at [pokemontcg.io](https://pokemontcg.io) — the free tier allows up to **1,000 requests/day**.

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Pokémon and all related names are trademarks of Nintendo / Creatures Inc. / GAME FREAK inc. Card images and data are provided by the [Pokémon TCG API](https://pokemontcg.io) and are not affiliated with this project.

---

<p align="center">Made with ⚡ by a Pokémon Trainer</p>
