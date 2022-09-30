FROM node:16-bullseye-slim

ENV LAST_UPDATED 2022-09-30-2037

ENV NODE_ENV production
ENV ENV production

RUN apt-get update
RUN apt-get install -y build-essential unzip nasm libtool make bash git autoconf wget zlib1g-dev python3

# Copy artifact
ADD *.zip /

# Unzip zip file
RUN unzip *.zip -d /temp
RUN unzip /temp/*.zip -d /app
RUN rm -rf /temp

# Change working directory
WORKDIR /app

# Install latest npm
RUN npm install -g npm@latest

# Install dependencies
RUN npm install
# Remove dev dependencies (not needed anymore)
RUN npm prune --production
# Get latest ui dependencies in time of build
RUN npm update @sogebot/ui-admin @sogebot/ui-overlay @sogebot/ui-helpers @sogebot/ui-oauth @sogebot/ui-public

# Expose API port to the outside
EXPOSE 20000
# Expose profiler to the outside
EXPOSE 9229

# Add startup script
COPY docker.sh /
RUN chmod +x /docker.sh
ENTRYPOINT ["/docker.sh"]