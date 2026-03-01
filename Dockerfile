FROM node:lts-alpine

RUN apk add --no-cache tzdata

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run compile

CMD ["node", "build/src/index.js"]
