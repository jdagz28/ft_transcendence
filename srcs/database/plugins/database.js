'use strict'
const Database = require('better-sqlite3');
const fp = require('fastify-plugin');
const fs = require('fs');
const path = require('node:path');

async function databaseConnector(fastify) {
  if (!process.env.DB_PATH || !process.env.DB_NAME) {
    fastify.log.fatal('Missing DB_PATH or DB_NAME in environment');
    process.exit(1);
  }

  // Build the database path from environment variables
  const databasePath = path.join(process.env.DB_PATH, `${process.env.DB_NAME}.sqlite`);
  fastify.log.debug(`Database path: ${databasePath}`);

  let db;

  if (fs.existsSync(databasePath)) {
    fastify.log.info(`Database already exists at: ${databasePath}`);
    db = new Database(databasePath, { verbose: fastify.log.debug });
  } else {
    fastify.log.info(`Creating new database at: ${databasePath}`);
    db = new Database(databasePath, { verbose: fastify.log.debug });
    
    // Set journal mode and create the "users" table
    try {
      db.pragma('journal_mode = WAL'); 
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          salt TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE
        );
      `);
      fastify.log.info("Created 'users' table successfully.");
    } catch (error) {
      fastify.log.error('Error creating tables:', error);
    }
  }

  fastify.decorate('db', db);
  fastify.log.info("Fastify instance has 'db': " + fastify.hasDecorator('db'));

  fastify.addHook('onClose', (instance, done) => {
    if (instance.db) {
      instance.db.close();
      fastify.log.info("Database closed successfully.");
    }
    done();
  });
}

module.exports = fp(databaseConnector, { name: 'database' });
