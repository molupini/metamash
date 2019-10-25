# base
FROM node:13-alpine as base

ENV PORT=3001
EXPOSE ${PORT}

# healthcheck
HEALTHCHECK --interval=10s --timeout=2s --start-period=15s \
    CMD node ./src/util/health.js

# labels and metadata 

ENV NODE_ENV=production

RUN apk add --no-cache tini

WORKDIR /node

COPY ./ns/package.json ./ns/package*.json ./

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

CMD ["nodemon", "./src/index.js"]


# source
FROM base as source

# ENV NODE_ENV=production

# ENV PATH=/node/node_modules/.bin:$PATH

# RUN npm install --only=production && npm cache clean --force

WORKDIR /node/app

COPY ./ns/. . 


# prod
FROM source as prod

# RUN chown -R node:node .

# ENV NODE_ENV=production

# ENV PATH=/node/node_modules/.bin:$PATH

# WORKDIR /node/app

# USER node

CMD ["node", "./src/index.js"]
