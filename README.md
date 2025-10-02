# Run The World

View your Strava activities organized by location - countries and cities where you've been active.

## Local Development Setup

### Quick Start (One Command)

```bash
npm run dev:local
```

This will:
1. Start PostgreSQL via Docker
2. Run database migrations
3. Start the development server

### Manual Setup

If you prefer to run each step manually:

**1. Configure environment:**
```bash
cp .env.example .env
```

For local development with mock data, set in `.env`:
```env
DATABASE_URL="postgresql://runtheworld:localdev@localhost:5432/runtheworld?schema=public"
NEXT_PUBLIC_USE_MOCKS=true
```

**2. Start everything:**
```bash
docker compose up -d          # Start PostgreSQL
npx prisma migrate dev        # Run migrations
npm run dev                   # Start dev server
```

Open [http://localhost:3000](http://localhost:3000) - you'll see a "Continue with Mock Data" button that bypasses Strava OAuth and uses fake activity data.

### Useful Commands

```bash
npm run dev:local    # Start database + migrations + dev server (all-in-one)
npm run db:start     # Start PostgreSQL only
npm run db:stop      # Stop PostgreSQL
npm run db:reset     # Reset database (delete all data, recreate schema)
```

### Mock Data

When `NEXT_PUBLIC_USE_MOCKS=true`:
- No Strava API calls are made
- 500 realistic activities are generated across 10 cities worldwide
- No rate limits
- Perfect for UI development and testing

### Stopping Local Database

```bash
docker compose down
```

To remove the database volume (reset all data):

```bash
docker compose down -v
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
