# The Playwright image version must be kept in sync with the playwright version in package.json.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV HEADLESS=true
CMD ["npm", "test"]
