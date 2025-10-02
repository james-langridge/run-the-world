#!/bin/bash

set -e

echo "🐳 Starting local PostgreSQL..."
docker compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec run-the-world-db pg_isready -U runtheworld > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL failed to start within 30 seconds"
    exit 1
  fi
  sleep 1
done

echo "🔄 Running database migrations..."
npx prisma migrate dev

echo "🚀 Starting development server..."
npm run dev
