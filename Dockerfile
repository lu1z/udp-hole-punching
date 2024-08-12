FROM node:latest

# WORKDIR /kaniko/buildcontext/

COPY /kaniko/buildcontext/localListener.js /kaniko/buildcontext/localListener.js
# COPY package-lock.json package-lock.json
# ADD node_modules.tar.gz .

# RUN npm install

# COPY /src ./src

EXPOSE 3001

ENTRYPOINT ["node", "localListener.js", "3001"]
CMD ["30000"]