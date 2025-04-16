#!/bin/bash

set -e

echo ">> Running entrypoint script..."

if [ ! -d "/data/sqlite" ]; then
  echo "Creating /data/sqlite directory..."
  mkdir -p /data/sqlite
fi

echo "Setting ownership and permissions for /data/sqlite directory..."
if ! chown -R node:node /data/sqlite 2>/dev/null; then
  echo "Warning: Could not change ownership of /data/sqlite. Ensure that the volume is mounted with correct permissions."
fi

if ! chmod -R 777 /data/sqlite 2>/dev/null; then
  echo "Warning: Could not change permissions for /data/sqlite."
fi

echo "Permissions set. Starting the application..."
exec "$@"
