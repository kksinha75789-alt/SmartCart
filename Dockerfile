# SmartCart Enterprise Node.js Backend Container
FROM node:22-alpine

WORKDIR /app

# Copy package and server files
COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY test_concurrency.js ./
COPY database ./database

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start backend server
CMD ["node", "server.js"]
