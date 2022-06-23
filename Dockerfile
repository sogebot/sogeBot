FROM node:18-bullseye-slim

ENV LAST_UPDATED 2022-06-22-1557

ENV NODE_ENV production
ENV ENV production

RUN apt-get update
RUN apt-get install -y build-essential nasm libtool make bash git autoconf wget zlib1g-dev python3

# Clone the dev files into the docker container
# RUN git clone --recurse-submodules https://github.com/sogebot/sogebot.dev.git app
RUN git clone https://github.com/sogebot/sogebot.dev.git _dev

# Copy source code over backend
COPY . /_dev/backend

# Change working directory
WORKDIR /_dev/backend

# Install dependencies
RUN make

# Remove dev dependencies (not needed anymore)
 RUN yarn install --production --ignore-scripts --prefer-offline

# Get latest ui dependencies in time of build
RUN yarn upgrade @sogebot/ui-admin @sogebot/ui-overlay @sogebot/ui-helpers @sogebot/ui-oauth @sogebot/ui-public

WORKDIR /_dev/backend
COPY . /app

RUN cp -r /_dev/node_modules /app/

# Change working directory
WORKDIR /app

# Expose API port to the outside
EXPOSE 20000
# Expose profiler to the outside
EXPOSE 9229

# Add startup script
COPY docker.sh /
RUN chmod +x /docker.sh
ENTRYPOINT ["/docker.sh"]