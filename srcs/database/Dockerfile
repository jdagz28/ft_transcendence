# Docker multistage build
FROM node:23-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

ENV npm_config_python=/usr/bin/python3

WORKDIR /builder
COPY package.json package-lock.json ./
# Install production dependencies
RUN npm ci --omit=dev  

COPY default_avatar.svg ./
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY . .

# start to build the app image
FROM node:23-slim

# dumb-init registers signal handlers for every signal that can be caught
RUN apt-get update && \
    apt-get install -y  --no-install-recommends dumb-init sqlite3 && \
    rm -rf /var/lib/apt/lists/*

# Copy production dependencies from the builder app
WORKDIR /app
COPY --from=builder /builder/node_modules ./node_modules
COPY --from=builder /builder/default_avatar.svg ./
COPY --from=builder /builder/entrypoint.sh /entrypoint.sh
COPY --from=builder /builder ./

RUN chmod +x /entrypoint.sh


# RUN npm rebuild better-sqlite3 --build-from-source

ENTRYPOINT ["dumb-init", "/entrypoint.sh" ]

