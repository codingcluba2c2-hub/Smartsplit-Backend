# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Production Stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install curl for healthchecks
RUN apk add --no-cache curl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Non-root user for security
USER node

EXPOSE 5000
CMD ["npm", "start"]