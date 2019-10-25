FROM node:13.0.1-alpine

ENV LAST_UPDATED 201910151750

ENV DB mongodb
ENV MONGOURI mongodb://localhost:27017/your-db-name
ENV NODE_ENV production
ENV ENV production

RUN apk add --no-cache make
RUN apk add --no-cache bash
RUN apk add --no-cache git

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