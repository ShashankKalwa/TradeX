# TradeX API. Multi-stage so the runtime image carries no dev dependencies.
FROM node:20-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
# --omit=dev keeps jest, nodemon and mongodb-memory-server out of the image.
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /usr/src/app

# Run as the unprivileged user that the node image already provides.
ENV NODE_ENV=production
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
COPY scripts ./scripts

USER node
EXPOSE 5000

# The app connects to Mongo on boot; give it a moment before health checks fail.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/index.js"]
