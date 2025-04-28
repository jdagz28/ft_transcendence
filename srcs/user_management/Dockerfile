# Docker multistage build
FROM node:23-slim as builder

WORKDIR /builder
COPY package.json package-lock.json ./
COPY ./entrypoint.sh /
RUN chmod +x /entrypoint.sh

# Install production dependencies
RUN npm ci --only-production

# start to build the app image
FROM node:23-slim

# dumb-init registers signal handlers for every signal that can be caught
RUN apt-get update && apt-get install -y dumb-init && \
    rm -rf /var/lib/apt/lists/*

# Copy production dependencies from the builder app
WORKDIR /app
COPY --from=builder /builder/node_modules ./node_modules
COPY . .
COPY /entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# run app with low permissions level user
USER node

ENTRYPOINT ["dumb-init", "/entrypoint.sh"]
# CMD ["npm", "start"]
# CMD ["npm", "run", "dev"]
