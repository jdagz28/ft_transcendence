FROM node:23-slim as deps

WORKDIR /app
COPY package.json package-lock.json ./
COPY ./entrypoint.sh /
RUN chmod +x /entrypoint.sh
RUN npm ci --omit=dev


# start to build the runtime image
FROM node:23-slim
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /entrypoint.sh /
RUN chmod +x /entrypoint.sh

# run app with low permissions level user
USER node

ENTRYPOINT ["/entrypoint.sh"]

