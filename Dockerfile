FROM node:lts as builder

ENV LAST_UPDATED 2023-29-10-2347

# Defaults to production, docker-compose overrides this to development on build and run.
ARG NODE_ENV=production
ARG ENV=production
ENV NODE_ENV $NODE_ENV
ENV ENV $ENV

RUN apt-get update
RUN apt-get install -y build-essential unzip nasm libtool make bash git autoconf wget zlib1g-dev python3

# Copy artifact
ADD *.zip /

# Unzip zip file
RUN unzip sogeBot-*.zip -d /app
RUN unzip node_modules-*.zip -d /app

# Change working directory
WORKDIR /app

# Rebuid node modules
RUN npm rebuild

# Prune development dependencies
RUN npm prune --production

FROM node:lts-slim
COPY --from=builder  /app/ /app/

# Add startup script
COPY docker.sh /
RUN chmod +x /docker.sh

# Expose API port to the outside
EXPOSE 20000
# Expose profiler to the outside
EXPOSE 9229

CMD ["/docker.sh"]