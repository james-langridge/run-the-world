# Run The World

View your Strava activities organized by location - countries and cities where you've been active.

## Local Development Setup

### 1. Start Local PostgreSQL Database

Start the local PostgreSQL database using Docker:

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with the database `runtheworld`.

### 2. Configure Environment

Copy `.env.example` to `.env` and update if needed:

```bash
cp .env.example .env
```

For local development with mock data, set:

```env
DATABASE_URL="postgresql://runtheworld:localdev@localhost:5432/runtheworld?schema=public"
NEXT_PUBLIC_USE_MOCKS=true
```

### 3. Run Database Migrations

```bash
npx prisma migrate dev
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - you'll see a "Continue with Mock Data" button that bypasses Strava OAuth and uses fake activity data.

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
