FROM node:23-bullseye

COPY package*.json ./
RUN npm install

COPY ./ ./app
WORKDIR /app

EXPOSE 3000

CMD ["node", "app.js"]