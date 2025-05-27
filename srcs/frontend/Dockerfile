# Docker multistage build
FROM node:23-slim AS builder

WORKDIR /app
COPY transcendence-app/package*.json ./  

RUN npm install 
COPY transcendence-app ./

# Build the app - outputs to /app/dist
RUN npm run build   