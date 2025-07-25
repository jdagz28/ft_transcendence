FROM node:23-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ sqlite3 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only-production

COPY . .
RUN chmod +x ./entrypoint.sh

RUN npm rebuild better-sqlite3 --build-from-source

ENTRYPOINT ["./entrypoint.sh" ]