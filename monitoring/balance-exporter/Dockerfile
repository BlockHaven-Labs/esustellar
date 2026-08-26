FROM node:20-alpine AS base
WORKDIR /app
COPY index.mjs .
EXPOSE 9464
ENV PORT=9464
USER node
CMD ["node", "index.mjs"]
