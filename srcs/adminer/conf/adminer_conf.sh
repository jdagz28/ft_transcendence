#!/bin/bash

mkdir -p /var/www/html

# Download the latest version of Adminer
echo "Downloading Adminer..."
if wget "http://www.adminer.org/latest.php" -O /var/www/html/adminer.php; then
    echo "Adminer downloaded successfully."
else
    echo "Failed to download Adminer." >&2
    exit 1
fi

# Set proper ownership and permissions
echo "Setting ownership and permissions..."
chown -R www-data:www-data /var/www/html/adminer.php
chmod 755 /var/www/html/adminer.php

# Navigate to the web root directory
cd /var/www/html || { echo "Failed to change directory to /var/www/html" >&2; exit 1; }

# Remove the default index.html if it exists
if [ -f index.html ]; then
    echo "Removing default index.html..."
    rm -f index.html
fi

# Start the PHP built-in server
echo "Starting PHP built-in server on port 8080..."
php -S 0.0.0.0:8080 -t /var/www/html
