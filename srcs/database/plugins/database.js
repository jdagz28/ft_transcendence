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
      createTournamentTable();
      createTourPlayersTable();
      createMatchesTable();
      createMatchGamesTable();
      createConversationsTable();
      createConvoMembersTable();
      createMessagesTable();
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

  function createTournamentTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournaments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          status TEXT NOT NULL
            CHECK (status IN ('pending', 'active', 'paused', 'aborted', 'finished')),
          mode TEXT NOT NULL
            CHECK (mode IN ('training', 'single-player', 'local-multiplayer', 'online-multiplayer')),
          playersNumber INTEGER NOT NULL,
          winner_id INTEGER,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (winner_id) REFERENCES users(id)
      );
    `);
  }

  function createTourPlayersTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tour_players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          score INTEGER DEFAULT 0,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  }

  function createMatchesTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tour_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          mode TEXT NOT NULL
            CHECK (mode IN ('training', 'single-player', 'local-multiplayer', 'online-multiplayer')),
          status TEXT NOT NULL
            CHECK (status IN ('pending', 'active', 'paused', 'aborted', 'finished')),
          player1_id INTEGER NOT NULL,
          player2_id INTEGER NOT NULL,
          player1_score INTEGER DEFAULT 0,
          player2_score INTEGER DEFAULT 0,
          winner_id INTEGER DEFAULT 0,
          total_games INTEGER DEFAULT 0,
          total_duration INTEGER DEFAULT 0,
          tournament_id INTEGER DEFAULT 0,
          round INTEGER DEFAULT 0,
          FOREIGN KEY (player1_id) REFERENCES users(id),
          FOREIGN KEY (player2_id) REFERENCES users(id),
          FOREIGN KEY (winner_id) REFERENCES users(id),
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
      );
    `);
  }

  function createMatchGamesTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS match_games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id INTEGER NOT NULL,
          status TEXT NOT NULL
            CHECK (status IN ('pending', 'active', 'paused', 'aborted', 'finished')),
          player1_hits INTEGER DEFAULT 0,
          player2_hits INTEGER DEFAULT 0,
          player1_score INTEGER DEFAULT 0,
          player2_score INTEGER DEFAULT 0,
          winner_id INTEGER DEFAULT 0,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (match_id) REFERENCES tour_matches(id) ON DELETE CASCADE,
          FOREIGN KEY (winner_id) REFERENCES users(id)
      );
    `);
  }

  function createConversationsTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          is_group BOOLEAN NOT NULL,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          name TEXT,
          type TEXT NOT NULL
            CHECK (type IN ('direct', 'group')),
          group_type TEXT NOT NULL
            CHECK (group_type IN ('public', 'private')),
          message_id INTEGER,
          FOREIGN KEY (message_id) REFERENCES messages(id)
      );
    `);
  }

  function createConvoMembersTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS convo_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT NOT NULL
            CHECK (role IN ('admin', 'member')),
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          muted_until DATETIME DEFAULT NULL,
          kicked_at DATETIME DEFAULT NULL,
          banned_at DATETIME DEFAULT NULL,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE (conversation_id, user_id)
      );
    `);
  }

  function createMessagesTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL,
          sender_id INTEGER NOT NULL,
          message_text TEXT NOT NULL,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  function createMessagesTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER NOT NULL,
          conversation_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sender_id) REFERENCES users(id),
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
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
