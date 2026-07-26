FROM node:20-alpine

WORKDIR /app

COPY frontend/package.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./

EXPOSE 5173

CMD ["npm", "run", "dev"]
