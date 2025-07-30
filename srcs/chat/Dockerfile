FROM node:23-slim

RUN apt-get update && apt-get install -y \
    python3 \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
