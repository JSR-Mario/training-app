# Build stage
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM nginx:alpine
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy Angular build output (assuming application builder with browser output)
# Fallback to copy the whole dist/training-app if browser doesn't exist
COPY --from=build /app/dist/training-app/browser /usr/share/nginx/html/browser
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
