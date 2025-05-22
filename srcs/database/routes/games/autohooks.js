'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')


module.exports = fp(async function gameAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('dbGames', {
    //! set num players and set default
    async createGame(userId, mode, maxPlayers) {
      try {
        let numPlayers 
        if (mode == "training" || mode == "single-player") {
          if (maxPlayers > 1) {
            throw new Error('Invalid number of players for this mode')
          }
          if (!maxPlayers) {
            numPlayers = 1
          }
        }
        else {
          numPlayers = maxPlayers || 2
        }
        // games table
        const query = fastify.db.prepare(
          'INSERT INTO games (created_by, mode, status, max_players) VALUES (?, ?, ?, ?)'
        )
        const result = query.run(userId, mode, 'pending', numPlayers)
        if (result.changes === 0) {
          throw new Error('Failed to create game')
        }
        const gameId = result.lastInsertRowid
        console.log('Game created with ID:', gameId) //! DELETE

        // game matches table
        const query2 = fastify.db.prepare(
          'INSERT INTO games_match (game_id, status) VALUES (?, ?)'
        )
        const result2 = query2.run(gameId, 'pending')
        if (result2.changes === 0) {
          throw new Error('Failed to create game')
        } 
        const matchId = result2.lastInsertRowid
        console.log('Game created with ID:', matchId) //! DELETE
        
        // match players table - games_match_scores
        const query3 = fastify.db.prepare(
          'INSERT INTO games_match_scores (match_id, player_id, status) VALUES (?, ?, ?)'
        )
        const result3 = query3.run(matchId, userId, 'pending')
        if (result3.changes === 0) {
          throw new Error('Failed to create game')
        }
        return gameId
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to create game')
      }
    },

    async getGames() {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM games'
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
          'SELECT * FROM games WHERE id = ?'
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
    },

    async joinGame(gameId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ?'
        )
        const checkGame = check.get(gameId)
        if (checkGame.status !== 'pending') {
          return { error: 'Game is not joinable' }
        }
        if (checkGame.num_players >= checkGame.max_players) {
          return { error: 'Game is full' }
        }
        const query = fastify.db.prepare(
          'UPDATE games SET num_players = num_players + 1 WHERE id = ?'
        )
        const result = query.run(gameId)
        if (result.changes === 0) {
          throw new Error('Failed to join game')
        }
        const query2 = fastify.db.prepare(
          'INSERT INTO games_match_scores (match_id, games_match_id) VALUES (?, ?)'
        )
        const result2 = query2.run(gameId, userId)
        if (result2.changes === 0) {
          throw new Error('Failed to join game')
        }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to join game')
      }
    }

  })
}, {
  name: 'gameAutoHooks'
})