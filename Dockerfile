
# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy all src code
COPY . .

# Build the Vite app
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine

# Copy the built frontend from the builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
