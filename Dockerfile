FROM node:12.10.0

ENV LAST_UPDATED 201709241704

ENV DOMAIN localhost
ENV TOKEN 7911776886
ENV DB mongodb
ENV MONGOURI mongodb://localhost:27017/your-db-name
ENV NODE_ENV production

RUN apt-get update
RUN apt-get install -y net-tools

# Copy source code
COPY . /app

# Change working directory
WORKDIR /app

# Install dependencies
RUN make

# Copy config example
RUN cp config.example.json config.json

# Expose API port to the outside
EXPOSE 20000

# Add startup script
COPY docker.sh /
RUN chmod +x /docker.sh
ENTRYPOINT ["/docker.sh"]