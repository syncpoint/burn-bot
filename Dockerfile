FROM node:18

USER node
ENV NODE_ENV=production

WORKDIR /usr/src/app
COPY --chown=node package*.json ./

RUN npm ci --omit=dev
# Bundle app source
COPY --chown=node . .

CMD [ "npm", "start" ]