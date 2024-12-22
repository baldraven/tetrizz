FROM node:22.11.0

RUN groupadd -r elaziz && useradd -r -m -g elaziz ely

WORKDIR /usr/src/tetrizz

COPY package*.json .

RUN npm install

COPY . .

EXPOSE 3000

USER ely

CMD node server/server.js
