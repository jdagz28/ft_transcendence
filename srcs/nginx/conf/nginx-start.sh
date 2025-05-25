#!/bin/bash

set -e

openssl req -x509 -nodes -days 365 -newkey rsa:2048 -out /etc/nginx/ssl/transcendence.crt -keyout /etc/nginx/ssl/transcendence.key -subj "/C=BE/ST=Brussels/L=Brussels/O=42/OU=42/CN=transcendence/UID=transcendence"

envsubst '$$SERVER_NAME $$AUTH_PORT $$USER_PORT $$GAMES_PORT $$BACKEND_PORT' \
    < /etc/nginx/nginx.conf.template \
    > /etc/nginx/nginx.conf


nginx -g 'daemon off;'