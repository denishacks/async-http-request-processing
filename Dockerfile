# web
FROM node:18.17.0 as web
WORKDIR /srv/http
COPY package.json .
RUN npm install --production
COPY . .
CMD ["npm", "run", "web"]

# worker
FROM node:18.17.0 as worker
WORKDIR /srv/http
COPY package.json .
RUN npm install --production
COPY . .
CMD ["npm", "run", "worker"]
