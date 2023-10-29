FROM node:lts-alpine

ENV LAST_UPDATED 2023-27-07-1033

# Defaults to production, docker-compose overrides this to development on build and run.
ARG NODE_ENV=production
ARG ENV=production
ENV NODE_ENV $NODE_ENV
ENV ENV $ENV

# Downgrade to npm 8, permission issue caused by https://github.com/npm/cli/issues/5889
# ERROR: failed to register layer: Error processing tar file(exit status 1): failed to Lchown "/app/node_modules/brorand/.npmignore" for UID 120012366, GID 120012366: lchown /app/node_modules/brorand/.npmignore: invalid argument
RUN npm install -g npm@8

# Copy artifact
ADD *.zip /

# Unzip zip file
RUN unzip *.zip -d /app

# Change working directory
WORKDIR /app

# Add startup script
COPY docker.sh /
RUN chmod +x /docker.sh

# Install packages (forcing to)
RUN npm install --verbose --force
# Clean .npm cache (not needed)
RUN npm cache clean --force

# Expose API port to the outside
EXPOSE 20000
# Expose profiler to the outside
EXPOSE 9229

ENTRYPOINT ["/docker.sh"]