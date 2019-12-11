FROM node:13.3.0-alpine

ENV LAST_UPDATED 2019-12-11-1247

ENV NODE_ENV production
ENV ENV production

RUN apk add --no-cache autoconf
RUN apk add --no-cache automake
RUN apk add --no-cache nasm
RUN apk add --no-cache libtool
RUN apk add --no-cache make
RUN apk add --no-cache bash
RUN apk add --no-cache git
RUN apk add --no-cache python
RUN apk add --no-cache build-base
RUN apk add --no-cache zlib zlib-dev

# Copy source code
COPY . /app

# Change working directory
WORKDIR /app

# Install dependencies
RUN make
# Remove dev dependencies (not needed anymore)
RUN npm prune --production

# Copy config example
RUN cp src/bot/data/config.example.json config.json

# Expose API port to the outside
EXPOSE 20000

# Add startup script
COPY docker.sh /
RUN chmod +x /docker.sh
ENTRYPOINT ["/docker.sh"]