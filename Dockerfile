FROM node:8.11.3@sha256:deb6287c3b94e153933ed9422db4524d2ee41be00b32c88a7cd2d91d17bf8a5e

WORKDIR /probot-app-label-release-pr

COPY package.json /probot-app-label-release-pr/

RUN yarn
