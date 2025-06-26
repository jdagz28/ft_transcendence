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
      db.exec('BEGIN')
      createUsersTable();
      createOAuthTable();
      createUserTokenTable();
      createUserAvatarsTable();
      createUserFriendsTable();
      createFriendRequestsTable();
      createUserBlocksTable();
      createTournamentTable();
      createTournamentSettingsTable();
      createTourPlayersTable();
      createTournamentGames();
      createTournamentAliasesTable();
      createGamesTable();
      createGamesSettingsTable();
      createGameMatchesTable();
      createGameMatchesScoresTable();
      createGamePlayers();
      createConversationsTable();
      createConvoMembersTable();
      createMessagesTable();
      createGroupInvitationsTable();
      db.exec('COMMIT');
      fastify.log.info("Created tables successfully.");
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
      CREATE TABLE IF NOT EXISTS user_mfa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        mfa_secret TEXT NOT NULL,
        mfa_token TEXT,
        mfa_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_mfa_user 
        ON user_mfa(user_id);
    `);
  }

  function createUserAvatarsTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_avatars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        avatar BLOB NOT NULL,
        mime_type TEXT NOT NULL,
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

      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_friends_pair
      ON user_friends (
        CASE WHEN user_id_a < user_id_b THEN user_id_a ELSE user_id_b END,
        CASE WHEN user_id_a < user_id_b THEN user_id_b ELSE user_id_a END
      );
    `);
  }

  function createFriendRequestsTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        requester_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('pending', 'accept', 'decline')),
        created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        responded DATETIME,
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
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
        created_by INTEGER NOT NULL,
        created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL
          CHECK (status IN ('pending', 'active', 'paused', 'aborted', 'finished')),
        started DATETIME DEFAULT NULL,
        ended DATETIME DEFAULT NULL,
        winner_id INTEGER DEFAULT NULL,
        name TEXT NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
  }

  function  createTournamentSettingsTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_settings (
        tournament_id INTEGER PRIMARY KEY,
        game_type TEXT NOT NULL
          CHECK (game_type IN ('singles', 'doubles')),
        game_mode TEXT NOT NULL
          CHECK (game_mode IN ('public', 'private')),
        max_players INTEGER NOT NULL,
        num_games INTEGER DEFAULT 1,
        num_matches INTEGER DEFAULT 1,
        ball_speed INTEGER DEFAULT 1,
        death_timed BOOLEAN DEFAULT 0,
        time_limit_s INTEGER DEFAULT 0,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
      );
    `);
  }

  function createTourPlayersTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score INTEGER DEFAULT 0,
        eliminated BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE (tournament_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_tour_players_tournament_id
        ON tournament_players(tournament_id);
      CREATE INDEX IF NOT EXISTS idx_tour_players_user_id
        ON tournament_players(user_id);
    `);
  }

  function createTournamentGames() {
    db.exec (`
      CREATE TABLE IF NOT EXISTS tournament_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'finished')),
        winner_id INTEGER,
        slot INTEGER NOT NULL DEFAULT 0,
        UNIQUE (tournament_id, game_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
    );
      CREATE INDEX IF NOT EXISTS idx_tournament_games_tournament_id
        ON tournament_games(tournament_id);
      CREATE INDEX IF NOT EXISTS idx_tournament_games_tournament_id_round_slot
        ON tournament_games(tournament_id, round, slot);
    `);
  }

  function createTournamentAliasesTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tournament_aliases (
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        alias TEXT NOT NULL,
        PRIMARY KEY (tournament_id, user_id),
        UNIQUE(alias),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }


  function createGamesTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_by INTEGER NOT NULL,
        created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        started DATETIME DEFAULT NULL,
        ended DATETIME DEFAULT NULL,
        status TEXT NOT NULL
          CHECK (status IN ('pending', 'active', 'paused', 'aborted', 'finished')),
        winner_id INTEGER DEFAULT NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
  }

  function createGamesSettingsTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_settings (
        game_id INTEGER PRIMARY KEY,
        mode TEXT NOT NULL
          CHECK (mode IN ('training', 'single-player', 'multiplayer', 'tournament')),
        game_type TEXT NOT NULL
          CHECK (game_type IN ('local', 'remote')),
        game_mode TEXT NOT NULL
          CHECK (game_mode IN ('private', 'public')),
        max_players INTEGER DEFAULT 1,
        num_games INTEGER DEFAULT 1,
        num_matches INTEGER DEFAULT 1,
        ball_speed INTEGER DEFAULT 1,
        death_timed BOOLEAN DEFAULT 0,
        time_limit_s INTEGER DEFAULT 0,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      );
    `);
  }

  function createGameMatchesScoresTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS match_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        score INTEGER DEFAULT 0,
        hits INTEGER DEFAULT 0,
        UNIQUE(match_id, player_id),
        FOREIGN KEY (match_id) REFERENCES game_matches(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }


  function createGameMatchesTable() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        winner_id INTEGER DEFAULT NULL,
        started DATETIME DEFAULT NULL,
        ended DATETIME DEFAULT NULL,
        updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);
  }

  function createGamePlayers() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS game_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        is_remote BOOLEAN NOT NULL DEFAULT 0,
        joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paddle_loc TEXT 
          CHECK(paddle_loc IN ('left','right')),
        paddle_side TEXT 
          CHECK(paddle_side IN ('top', 'bottom')),
        UNIQUE(game_id, player_id),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
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
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
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

  function createGroupInvitationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS group_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      invited_user_id INTEGER NOT NULL,
      invited_by_user_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined')),
      created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      responded DATETIME DEFAULT NULL,
      FOREIGN KEY (group_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (invited_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

  fastify.decorate('db', db);
  fastify.log.info("Fastify instance has 'db': " + fastify.hasDecorator('db')); 

  const aiUserExists = fastify.db.prepare(`
    SELECT id FROM users WHERE username = ?
  `).get('AiOpponent');
  if (aiUserExists) {
    fastify.log.info("AI user already exists, skipping creation.");
    fastify.decorate('aiUserId', aiUserExists.id);
    return;
  }
  
  const result = fastify.db.prepare(`
    INSERT INTO users (username, email, password, salt, nickname)
    VALUES (?, ?, ?, ?, ?)
  `).run('AiOpponent', 'ai@example.com', 'password', 'salt', 'AI AiOpponent');
  const aiId = result.lastInsertRowid;
  fastify.log.info(`AI user created with ID: ${aiId}`);

  fastify.decorate('aiUserId', aiId);
  fastify.log.info("Fastify instance has 'aiUserId': " + fastify.hasDecorator('aiUserId'));


  fastify.addHook('onClose', (instance, done) => {
    if (instance.db) {
      instance.db.close();
      fastify.log.info("Database closed successfully.");
    }
    done();
  });
}

module.exports = fp(databaseConnector, { name: 'database' });
