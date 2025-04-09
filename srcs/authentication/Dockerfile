# Docker multistage build
FROM node:23-slim as builder

WORKDIR /builder
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only-production

# start to build the app image
FROM node:23-slim

# dumb-init registers signal handlers for every signal that can be caught
RUN apt-get update && apt-get install -y dumb-init sqlite3 libsqlite3-dev curl python3 make g++&& \
    rm -rf /var/lib/apt/lists/*
RUN mkdir -p /data/sqlite && chown -R node:node /data/sqlite 

# Copy production dependencies from the builder app
WORKDIR /app
COPY --from=builder /builder/node_modules ./node_modules
COPY . .

RUN npm rebuild better-sqlite3 --build-from-source

# run app with low permissions level user
USER node

EXPOSE 3000
ENTRYPOINT ["dumb-init"]
CMD ["npm", "start"]
# CMD ["npm", "run", "dev"]
