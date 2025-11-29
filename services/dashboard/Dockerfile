FROM node:20-slim

WORKDIR /app

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY services/dashboard/package*.json ./

# Install dependencies
RUN npm install

# Copy prisma schema (needed for Prisma Client generation)
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy application files
COPY services/dashboard/index.js ./
COPY services/dashboard/public ./public

# Expose dashboard port
EXPOSE ${DASHBOARD_PORT:-666}

# Run the dashboard
CMD ["npm", "start"]
