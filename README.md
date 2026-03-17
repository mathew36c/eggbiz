# Egg Business PWA

A production-ready Progressive Web App (PWA) for managing a small egg distribution business.

## Features

- **Mobile-First Design**: Optimized for quick use while driving
- **Inventory Management**: Track egg trays (S, M, L, XL)
- **Sales Tracking**: Quick entry with preset price buttons
- **Expense Tracking**: Log fuel, maintenance, supplies, food, misc
- **Dashboard**: Daily and monthly metrics
- **Analytics**: Charts using Recharts
- **Offline Support**: Works without internet, syncs when back online
- **PWA**: Installable on Android and iPhone

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Supabase (PostgreSQL + Auth + API)
- Tailwind CSS
- Recharts
- IndexedDB for offline data

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## PWA Installation

- **Android**: Chrome menu → "Add to Home Screen"
- **iPhone**: Safari share button → "Add to Home Screen"

## Pages

- `/` - Dashboard with daily metrics
- `/inventory` - Stock levels and purchases
- `/add-inventory` - Add new inventory
- `/sales` - Sales log with filters
- `/add-sale` - Record new sale with quick prices
- `/expenses` - Expense log with categories
- `/add-expense` - Add new expense
- `/analytics` - Charts and insights

## Offline Mode

When offline:
- Data is stored locally in IndexedDB
- App works with cached pages
- Pending entries sync automatically when back online