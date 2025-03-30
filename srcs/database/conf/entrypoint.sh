#!/bin/bash

DB_FILE="/data/sqlite/${DB_NAME}.sqlite"

# Create database file if it doesn't exist
if [ ! -f "$DB_FILE" ]; then
    echo "Creating new SQLite database at $DB_FILE"
  
    # Create users table
    echo "Creating users table..."
    sqlite3 "$DB_FILE" <<EOF
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);
EOF

else
  echo "Database already exists at $DB_FILE"
fi

echo "Database ready at $DB_FILE. Waiting..."
tail -f /dev/null
