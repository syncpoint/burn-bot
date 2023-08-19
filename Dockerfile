FROM node:18

ENV NODE_ENV=production

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm ci --omit=dev
# Bundle app source
COPY  . .

RUN ln -s /usr/src/app/src/login.mjs /usr/src/app/login

ENTRYPOINT [ "node" ]
CMD [ "./src/index.mjs" ]