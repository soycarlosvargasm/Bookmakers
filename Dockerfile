FROM node:22-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci
RUN npx playwright install --with-deps chromium

COPY tsconfig.json ./
COPY src ./src
COPY docs ./docs
COPY migrations ./migrations
COPY scripts ./scripts
RUN npm run build

ENV NODE_ENV=production
CMD ["node", "scripts/start.mjs"]
