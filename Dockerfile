# Multi-stage build for optimized production image
FROM node:22-alpine AS builder
 
# Set working directory
WORKDIR /app
 
# Copy package files for dependency installation
COPY package*.json ./
 
# Install dependencies 
RUN npm install
 
# Copy source code
COPY . .
 
# Build the application
RUN npm run build
 
# Production stage - serve with nginx
FROM nginx:stable-alpine AS production
 
# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
 
# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
 
# Expose port 80
EXPOSE 80
 
# Start nginx
CMD ["nginx", "-g", "daemon off;"]
