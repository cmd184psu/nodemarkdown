FROM node:12

# Create app directory
WORKDIR /usr/src/app

RUN mkdir /usr/src/app/docs

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 5050


#CMD [ "bash" ]
CMD [ "node", "server.js" ]

