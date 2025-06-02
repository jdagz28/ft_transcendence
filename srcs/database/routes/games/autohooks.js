'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')


module.exports = fp(async function gameAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('dbGames', {
    //! set num players and set default
    async createGame(userId, mode, maxPlayers, gameType, gameMode) {
      try {
        // games table
        const query = fastify.db.prepare(
          'INSERT INTO games (created_by, mode, status, max_players, game_type, game_mode) VALUES (?, ?, ?, ?, ?, ?)' // gameType and gameMode added
        )
        const result = query.run(userId, mode, 'pending', maxPlayers, gameType, gameMode)
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
        console.log('Game Match created with ID:', matchId) //! DELETE
        
        // match players table - games_match_scores
        const query3 = fastify.db.prepare(
          'INSERT INTO games_match_scores (games_match_id, player_id) VALUES (?, ?)'
        )
        const result3 = query3.run(matchId, userId)
        if (result3.changes === 0) {
          throw new Error('Failed to create game')
        }
        console.log('Game Match Players created with ID:', result3.lastInsertRowid) //! DELETE
        return gameId
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to create game')
      }
    },

    async updateGameOptions(gameId, userId, num_games, num_matches, ball_speed, death_timed, time_limit) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ? AND created_by = ?'
        )
        const result = query.run(gameId, userId)
        if (!result || result.length === 0) {
          throw new Error('Game not found or user not authorized')
        }

        const updateQuery = fastify.db.prepare(
          'UPDATE games SET num_games = ?, num_matches = ?, ball_speed = ?, death_timed = ?, time_limit = ? WHERE id = ?'
        )
        const updateResult = updateQuery.run(num_games, num_matches, ball_speed, death_timed, time_limit, gameId)
        if (updateResult.changes === 0) {
          throw new Error('Failed to update game options')
        }
        return { message: 'Game options updated successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to update game options')
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
        if (checkGame.total_players >= checkGame.max_players) {
          return { error: 'Game is full' }
        }
        const query = fastify.db.prepare(
          'UPDATE games SET total_players = total_players + 1 WHERE id = ?'
        )
        const result = query.run(gameId)
        if (result.changes === 0) {
          throw new Error('Failed to join game')
        }

        const query2 = fastify.db.prepare(
          'SELECT * FROM games_match WHERE game_id = ?'
        )
        const result2 = query2.get(gameId)
        if (!result2) {
          throw new Error('Match not found')
        }
        const matchId = result2.id

        const query3 = fastify.db.prepare(
          'INSERT INTO games_match_scores (games_match_id, player_id) VALUES (?, ?)'
        )
        const result3 = query3.run(matchId, userId)
        if (result3.changes === 0) {
          throw new Error('Failed to join game')
        }
        
        return { message: 'Joined game successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to join game')
      }
    },

    async createTournament(userId, name, mode, maxPlayers) {
      try {
        const query = fastify.db.prepare(
          'INSERT INTO tournaments (created_by, name, mode, max_players, status) VALUES (?, ?, ?, ?, ?)'
        )
        const result = query.run(userId, name, mode, maxPlayers, "pending")
        if (result.changes === 0) {
          throw new Error('Failed to create tournament')
        }
        const tournamentId = result.lastInsertRowid
        console.log('Tournament created with ID:', tournamentId) //! DELETE
        
        const tourPlayersQuery = fastify.db.prepare(
          'INSERT INTO tour_players (tournament_id, user_id) VALUES (?, ?)'
        )
        const tourPlayersResult = tourPlayersQuery.run(tournamentId, userId)
        if (tourPlayersResult.changes === 0) {
          throw new Error('Failed to add user to tournament players')
        }
        console.log('Tournament Players created with ID:', tourPlayersResult.lastInsertRowid) //! DELETE

        // Create game
        const gameId = await fastify.dbGames.createGame(userId, "tournament", maxPlayers)
        if (!gameId) {
          throw new Error('Failed to create game for tournament')
        }
        console.log('Game created for tournament with ID:', gameId) //! DELETEs

        return tournamentId
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to create tournament')
      }
    }

  })
}, {
  name: 'gameAutoHooks'
})