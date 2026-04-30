FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /tests

COPY package.json ./
RUN npm install

COPY . .

# Default: run all tests (api then ui)
CMD ["npm", "test"]
