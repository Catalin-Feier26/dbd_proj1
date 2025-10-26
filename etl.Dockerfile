# Start from PostgreSQL image (for the psql client)
FROM postgres:15-alpine

# Install Python and pip so we can run preprocessing
RUN apk add --no-cache python3 py3-pip bash

# Copy your scripts inside the container
WORKDIR /scripts

# Default command (so container keeps running if needed)
CMD ["tail", "-f", "/dev/null"]
