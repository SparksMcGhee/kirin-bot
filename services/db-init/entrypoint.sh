#!/bin/sh
set -e

echo "🔄 Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL
until pg_isready -h postgres -p 5432 -U "${POSTGRES_USER:-kirin}"; do
  echo "⏳ PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

echo "🔄 Running Prisma migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npm run prisma:seed

echo "🎉 Database initialization complete!"

