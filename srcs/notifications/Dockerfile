FROM node:23-slim

WORKDIR /app

COPY package*.json ./
COPY ./entrypoint.sh ./

RUN npm ci 
COPY . .
RUN chmod +x ./entrypoint.sh  


ENTRYPOINT ["/app/entrypoint.sh"]
