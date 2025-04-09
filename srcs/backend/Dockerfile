# Docker multistage build
FROM node:23-alpine as builder

WORKDIR /builder
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --only-production --ignore-scripts

# start to build the app image
FROM node:23-alpine

# dumb-init registers signal handlers for every signal that can be caught
RUN apk update && apk add --no-cache dumb-init sqlite curl 
RUN mkdir -p /data/sqlite && \
    chown -R node:node /data/sqlite 

# Copy production dependencies from the builder app
WORKDIR /app
COPY --from=builder /builder/node_modules ./node_modules
COPY . .

# run app with low permissions level user
USER node

EXPOSE 3000
ENTRYPOINT ["dumb-init"]
CMD ["npm", "start"]
