FROM alpine

RUN apk add --no-cache nodejs npm tzdata

WORKDIR /usr/src/app

COPY . .
RUN npm ci && npm run compile

CMD ["node", "build/src/index.js"]
