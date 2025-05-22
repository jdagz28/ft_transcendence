# Use a Node base image
FROM node:18-alpine

# Set the working directory
WORKDIR ./

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build assets if needed (optional)
# RUN npm run build

# Run development server (can be overridden)
CMD ["npm", "run", "dev"]
