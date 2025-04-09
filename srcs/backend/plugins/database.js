'use strict'

const Database = require('better-sqlite3')
const fp = require('fastify-plugin')


async function databaseConnector(fastify) {
  if (!process.env.DB_PATH || !process.env.DB_NAME) {
    fastify.log.fatal('Missing DB_PATH or DB_NAME in environment')
    process.exit(1)
  }

  try {
    const db = new Database(
      `${process.env.DB_PATH}${process.env.DB_NAME}.sqlite`,
      { verbose: fastify.log.debug } 
    )

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

    fastify.log.info('Database schema validated')
    
    fastify.decorate('db', db)
    
    fastify.addHook('onClose', (instance) => {
      instance.db.close()
    });

  } catch (err) {
    fastify.log.fatal('Database initialization failed:', err)
    process.exit(1)
  }
}


module.exports = fp(databaseConnector, { name: 'database' })