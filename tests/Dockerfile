FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /tests

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Default: run all tests (api then ui)
CMD ["npm", "test"]
