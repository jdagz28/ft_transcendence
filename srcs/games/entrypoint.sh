#!/bin/bash

# Check NODE_ENV variable
if [ -z "$NODE_ENV" ]; then
  echo "NODE_ENV is not set. Defaulting to 'development'."
  export NODE_ENV=development
fi
if [ "$NODE_ENV" != "production" ]; then
  echo "Running in development mode."
  # Run the application in development mode
  npm run dev
else
  echo "Running in production mode."
  # Run the application in production mode
  npm start
fi