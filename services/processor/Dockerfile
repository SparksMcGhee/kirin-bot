FROM node:20-slim

WORKDIR /app

# Install OpenSSL
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema
COPY prisma ./prisma

# Copy source code
COPY src ./src

# Build TypeScript (includes prisma generate)
RUN npm run build

# Run the processor worker
CMD ["node", "dist/workers/processor-worker.js"]
