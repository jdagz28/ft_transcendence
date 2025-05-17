# Docker multistage build
FROM node:23-slim as builder

WORKDIR /builder
COPY transcendence-app/package*.json ./  

RUN npm install 
COPY transcendence-app ./

# Build the app - outputs to /builder/dist
RUN npm run build   