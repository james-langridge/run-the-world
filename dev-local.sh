#!/bin/bash

set -e

echo "🐳 Starting local PostgreSQL..."
docker compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
timeout 30 bash -c 'until docker compose exec -T postgres pg_isready -U runtheworld > /dev/null 2>&1; do sleep 1; done'

if [ $? -eq 0 ]; then
  echo "✅ PostgreSQL is ready"
else
  echo "❌ PostgreSQL failed to start"
  exit 1
fi

echo "🔄 Running database migrations..."
npx prisma migrate dev

echo "🚀 Starting development server..."
npm run dev
