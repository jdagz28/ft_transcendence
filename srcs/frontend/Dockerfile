# Docker multistage build
FROM node:23-slim 

WORKDIR /app
COPY transcendence-app/package*.json ./  

RUN npm install 
COPY transcendence-app ./

RUN npm run build   