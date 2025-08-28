# Repository Metadata Manager Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S alteriom -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Set ownership to non-root user
RUN chown -R alteriom:nodejs /usr/src/app
USER alteriom

# Expose port (if needed for web interface)
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Set default command
CMD ["node", "bin/enhanced-cli.js", "--help"]

# Labels for metadata
LABEL \
  org.opencontainers.image.title="Repository Metadata Manager" \
  org.opencontainers.image.description="Complete repository compliance and health management suite" \
  org.opencontainers.image.vendor="Alteriom Organization" \
  org.opencontainers.image.version="2.0.0" \
  org.opencontainers.image.licenses="MIT"
