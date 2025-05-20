'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')


module.exports = fp(async function gameAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('dbGames', {
    async createGame(userId, mode) {
      try {
        const query = fastify.db.prepare(
          'INSERT INTO matches (created_by, mode, status) VALUES (?, ?, ?)'
        )
        const result = query.run(userId, mode, 'pending')
        if (result.changes === 0) {
          throw new Error('Failed to create game')
        }
        const gameId = result.lastInsertRowid
        console.log('Game created with ID:', gameId)
        return gameId
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to create game')
      }
    },

    async getGames() {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM matches'
        )
        const games = query.all()
        if (!games) {
          throw new Error('Failed to retrieve games')
        }
        return games
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve games')
      }
    },

    async getGameById(gameId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM matches WHERE id = ?'
        )
        const game = query.get(gameId)
        if (!game) {
          throw new Error('Game not found')
        }
        return game
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve game')
      }
    }

  })
}, {
  name: 'gameAutoHooks'
})