FROM node:16-stretch-slim

ENV LAST_UPDATED 2021-10-18-1451

ENV NODE_ENV production
ENV ENV production

RUN apt-get update
RUN apt-get install -y build-essential nasm libtool make bash git autoconf

# Building python manually as it is not in linux/arm/v7
RUN wget https://www.python.org/ftp/python/3.6.5/Python-3.6.5.tar.xz
RUN tar xf Python-3.6.5.tar.xz
RUN cd Python-3.6.5
RUN ./configure
RUN make
RUN sudo make altinstall

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