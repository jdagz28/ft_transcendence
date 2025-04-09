#!/bin/bash

SQLITE_DIR="/data/sqlite/"
DB_FILE="/data/sqlite/${DB_NAME}.sqlite"

chown "$USER:$USER" "$SQLITE_DIR" 2>/dev/null || true
chmod 777 "$SQLITE_DIR" # Danger

# Create database file if it doesn't exist
if [ ! -f "$DB_FILE" ]; then
    echo "Creating new SQLite database at $DB_FILE"
  
    # Create users table
    echo "Creating users table..."
    sqlite3 "$DB_FILE" <<EOF
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  salt TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);
EOF

  chown "$USER:$USER" "$DB_FILE" 2>/dev/null || true
  chmod 777 "$DB_FILE" # Danger

else

  chown "$USER:$USER" "$DB_FILE" 2>/dev/null || true
  chmod 777 "$DB_FILE" # Danger
  echo "Database already exists at $DB_FILE"
fi

echo "Database ready at $DB_FILE. Waiting..."
# tail -f /dev/null
exit 0 # temporary; s