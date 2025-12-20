FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Use --host to expose to network
CMD ["npm", "run", "dev", "--", "--host"]
