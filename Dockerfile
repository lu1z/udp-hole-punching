FROM node:latest

# WORKDIR /app

COPY localListener.js localListener.js
# COPY package-lock.json package-lock.json
# ADD node_modules.tar.gz .

# RUN npm install

# COPY /src ./src

EXPOSE 3001

ENTRYPOINT ["node", "localListener.js", "3001"]
CMD ["30000"]