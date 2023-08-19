FROM node:18

LABEL org.opencontainers.image.source=https://github.com/syncpoint/burn-bot
LABEL org.opencontainers.image.description="A bot for Matrix that burns messages after a given time"
LABEL org.opencontainers.image.licenses=MIT

ENV NODE_ENV=production

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm ci --omit=dev
# Bundle app source
COPY  . .

RUN ln -s /usr/src/app/src/login.mjs /usr/src/app/login

ENTRYPOINT [ "node" ]
CMD [ "./src/index.mjs" ]