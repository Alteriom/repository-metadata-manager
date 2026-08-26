# Repository Metadata Manager Dockerfile
FROM node:24-alpine

# Set working directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S alteriom -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy application code with its final runtime ownership. Production
# dependencies remain root-owned and read-only to the runtime user.
COPY --chown=alteriom:nodejs . .

# Create the writable repository mount point without recursively traversing
# the dependency tree (which is especially costly on Docker Desktop).
RUN install -d -o alteriom -g nodejs /workspace
USER alteriom

VOLUME ["/workspace"]

# Verify the CLI remains executable in the image.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node bin/repo-manager.js --version || exit 1

# Containers are read-only evaluators unless an explicit plan is mounted and approved.
CMD ["node", "bin/repo-manager.js", "check", "--format", "json", "--project", "/workspace"]

# Labels for metadata
LABEL \
  org.opencontainers.image.title="Repository Metadata Manager" \
  org.opencontainers.image.description="Complete repository compliance and health management suite" \
  org.opencontainers.image.vendor="Alteriom Organization" \
  org.opencontainers.image.version="3.0.0" \
  org.opencontainers.image.licenses="MIT"
