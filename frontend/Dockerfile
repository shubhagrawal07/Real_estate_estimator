# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Ensure public directory exists (Next.js may need it)
RUN mkdir -p public || true

# NEXT_PUBLIC_* is inlined at build time; must be set when building the image
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

# Build Next.js application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy standalone build from builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory (may be empty, but Next.js standalone needs it)
COPY --from=builder /app/public ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Run the application
CMD ["node", "server.js"]

