'use strict'

const sqlite3 = require('sqlite3').verbose();
const fp = require('fastify-plugin');

async function databaseConnector(fastify, options) {
  const db = new sqlite3.Database(`${process.env.DB_PATH}${process.env.DB_NAME}.sqlite`,  
    // const db = new sqlite3.Database(`/home/ft_transcendence/sqlite/transcendence.sqlite`, 
      sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        fastify.log.error('Could not connect to database', err)
      } else {
        fastify.log.info('Connected to the SQLite database')
      }
    })

  db.prepare('SELECT 1').get((err, row) => {
    if (err) {
      fastify.log.error('Preliminary test query failed', err)
    } else {
      fastify.log.info('Preliminary test query succeeded:', row)
    }
  });

  fastify.decorate('db', db)
  fastify.addHook('onClose', (instance, done) => {
  if (instance.db) {
      instance.db.close()
    }
    done()
  })

} 

module.exports = fp(databaseConnector, { name: 'database' })