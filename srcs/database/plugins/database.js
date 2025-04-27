'use strict'

const Database = require('better-sqlite3');
const fp = require('fastify-plugin');
const fs = require('fs');
const { create } = require('node:domain');
const path = require('node:path');

async function databaseConnector(fastify) {
  if (!process.env.DB_PATH || !process.env.DB_NAME) {
    fastify.log.fatal('Missing DB_PATH or DB_NAME in environment');
    process.exit(1);
  }

  const databasePath = path.join(process.env.DB_PATH, `${process.env.DB_NAME}.sqlite`);
  
  fastify.log.debug(`Database path: ${databasePath}`);

  let db;
  if (fs.existsSync(databasePath)) {
    fastify.log.info(`Database already exists at: ${databasePath}`);
    db = new Database(databasePath, { verbose: fastify.log.debug });
  } else {
    fastify.log.info(`Creating new database at: ${databasePath}`);
    db = new Database(databasePath, { verbose: fastify.log.debug });
    
    try {
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      createUsersTable();
      createOAuthTable();
      createUserTokenTable();
      createUserAvatarsTable();
      createUserFriendsTable();
      createUserBlocksTable();
      fastify.log.info("Created 'users' table successfully.");
    } catch (error) {
      fastify.log.error('Error creating tables:', error);
    }
  }

  function createUsersTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          salt TEXT NOT NULL,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          nickname TEXT UNIQUE
      );
    `);
  }

  function createOAuthTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS oauth (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          provider_uid TEXT NOT NULL,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE (provider, provider_uid)
      );
    `);
  }

  function createUserTokenTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_token (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          mfa_token TEXT NOT NULL,
          mfa_valid DATETIME NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  function createUserAvatarsTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_avatars (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          avatar BLOB NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  function createUserFriendsTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_friends (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id_a INTEGER NOT NULL,
          user_id_b INTEGER NOT NULL,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id_a) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id_b) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  function createUserBlocksTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_blocks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          blocker_id INTEGER NOT NULL,
          blocked_user_id INTEGER NOT NULL,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
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
