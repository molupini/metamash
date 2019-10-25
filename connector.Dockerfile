# base
FROM node:10-alpine as base

ENV NODE_ENV=development

RUN apk add --no-cache tini

WORKDIR /node

COPY ./connect/package.json ./connect/package*.json ./

# need to verify the .then() warning 
RUN npm config list && npm ci && npm cache clean --force

ENTRYPOINT ["/sbin/tini", "--"]


# dev
FROM base as dev

ENV NODE_ENV=development

ENV NODE_TLS_REJECT_UNAUTHORIZED=0

ENV PATH=/node/node_modules/.bin:$PATH

RUN npm install --only=development

WORKDIR /node/app

CMD ["nodemon", "./bin/test.js"]


# source
FROM base as source

# ENV NODE_ENV=production

# ENV PATH=/node/node_modules/.bin:$PATH

# RUN npm install --only=production && npm cache clean --force

WORKDIR /node/app

COPY ./connect/. . 


# prod
FROM source as prod

# RUN chown -R node:node .

# ENV NODE_ENV=production

# ENV PATH=/node/node_modules/.bin:$PATH

# WORKDIR /node/app

# USER node

CMD ["node", "./bin/test.js"]