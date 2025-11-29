FROM node:20-slim

WORKDIR /app

# Install PostgreSQL client and OpenSSL
RUN apt-get update && apt-get install -y \
    postgresql-client \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Copy source code
COPY src ./src

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Copy entrypoint script
COPY services/db-init/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Run migrations and seed
CMD ["./entrypoint.sh"]

