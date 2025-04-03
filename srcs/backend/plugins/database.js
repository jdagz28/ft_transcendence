'use strict'

const sqlite3 = require('sqlite3').verbose();
const fp = require('fastify-plugin');

async function connectToDatabase(fastify, options) {
  const db = new sqlite3.Database(`/data/sqlite/${process.env.DB_NAME}.sqlite`, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      fastify.log.error('Could not connect to database', err)
    } else {
      fastify.log.info('Connected to the SQLite database')
    }
  })

  fastify.decorate('db', db)
}

module.exports = fp(connectToDatabase);