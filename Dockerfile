# --- STAGE 1: Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build steps)
RUN npm ci

# Copy full application files
COPY . .

# Compile application (build React assets & bundle server.ts)
ENV NODE_ENV=production
RUN npm run build

# --- STAGE 2: Production Safe Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

# Set production context
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests for pruning
COPY package*.json ./

# Install ONLY production-grade dependencies to ensure lightweight footprint
RUN npm ci --only=production && npm cache clean --force

# Copy only compiled assets and server bundles from the builder block
COPY --from=builder /app/dist ./dist

# Expose port (Dokploy will map this port dynamically to your subdomain/routing)
EXPOSE 3000

# Start command
CMD ["node", "dist/server.cjs"]
