# astrobitplays.me 🎮

The official gaming portal, reviews, walkthroughs, and creator hub for **AstroBitPlays** (`@astrobitplayss` on YouTube and `@astrobitplays` across socials).

Live Domain: [https://astrobitplays.me](https://astrobitplays.me)  
Repository: [https://github.com/JimKaracostas/astrobitplays.me](https://github.com/JimKaracostas/astrobitplays.me)

---

## ⚡ Features

- **Gaming Magazine Layout**: Inspired by professional gaming portals (GAMXO, Unboxholics, IGN) with high-contrast dark slate styling and crimson accents.
- **Star Rating Reviews**: Comprehensive game reviews with customizable star scores (e.g. `9.2 ★ / 10`) and verdict breakdowns.
- **Creator Studio & Dashboard**:
  - Dedicated dashboard just for Jim / AstroBitPlays.
  - Create, edit, and delete reviews, walkthroughs, news, and guides.
  - Live preview of cards and embedded YouTube video player before publishing.
  - Draft vs Published status controls.
  - Real reader view counter tracking.
- **Integrated YouTube Player**: Seamless embed supporting standard YouTube URLs, `youtu.be`, and YouTube Shorts.
- **Accounts & Roles**: Creator admin privileges (`astrobitplays`) and member accounts with saved bookmarks.
- **Zero Mock Data**: Clean initial slate so every post on the site is 100% created and curated by the creator.
- **Authentic Social Links**: Direct links to YouTube (`@astrobitplayss`), Twitch, X/Twitter, Instagram, and TikTok (`@astrobitplays`).
- **Automated GitHub Pages Deployment**: Fully configured `.github/workflows/deploy.yml` workflow deploying directly to `astrobitplays.me`.

---

## 🛠️ Tech Stack

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Lucide Icons**
- **Canvas Confetti**

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle for astrobitplays.me
npm run build
```

---

## 🌐 Custom Domain & GitHub Pages Setup

The project includes `CNAME` configured for `astrobitplays.me`.

DNS records (Namecheap):
- **A Records (@)**:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- **CNAME (www)**:
  - `astrobitplays.me` (or `JimKaracostas.github.io`)
