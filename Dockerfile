FROM node:16-stretch-slim

ENV LAST_UPDATED 2021-10-18-1451

ENV NODE_ENV production
ENV ENV production

RUN apt-get update
RUN apt-get install -y build-essential nasm libtool make bash git python autoconf

# cwebp error while loading shared libraries: libGL.so.1: cannot open shared object file: No such file or directory
RUN apt-get install -y libglu1 libxi6

# Copy source code
COPY . /app

# Change working directory
WORKDIR /app

# Install latest npm
RUN npm install -g npm@latest

# Install dependencies
RUN make
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