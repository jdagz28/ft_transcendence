'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')


module.exports = fp(async function gameAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('dbGames', {
    async createGame(userId, mode, maxPlayers, gameType, gameMode) {
      try {
        fastify.db.exec('BEGIN')

        // games table
        const query = fastify.db.prepare(
          'INSERT INTO games (created_by, status) VALUES (?, ?)'
        )
        const result = query.run(userId,'pending')
        if (result.changes === 0) {
          throw new Error('Failed to create game')
        }
        const gameId = result.lastInsertRowid
        console.log('Game created with ID:', gameId) //! DELETE

        // games settings table
        const query1 = fastify.db.prepare(
          'INSERT INTO game_settings (game_id, mode, game_type, game_mode, max_players) VALUES (?, ?, ?, ?, ?)'
        )
        const result1 = query1.run(gameId, mode, gameType, gameMode, maxPlayers)
        if (result1.changes === 0) {
          throw new Error('Failed to create game settings')
        }
        console.log('Game Settings created with ID:', result1.lastInsertRowid) //! DELETE

        // game players table
        const query4 = fastify.db.prepare(
          'INSERT INTO game_players (game_id, player_id) VALUES (?, ?)'
        )
        const result4 = query4.run(gameId, userId)
        if (result4.changes === 0) {
          throw new Error('Failed to add user to game players')
        }
        console.log('Game Players created with ID:', result4.lastInsertRowid) //! DELETE

        fastify.db.exec('COMMIT')
        return gameId
      } catch (err) {
        fastify.log.error(err)
        fastify.db.exec('ROLLBACK')
        throw new Error('Failed to create game')
      }
    },

    async updateGameOptions(gameId, userId, num_games, num_matches, ball_speed, death_timed, time_limit) {
      try {
        const selectQuery = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ? AND created_by = ?'
        )
        const row = selectQuery.get(gameId, userId)
        if (!row) {
          throw new Error('Game not found or user not authorized')
        }

        const deathTimedInt = death_timed ? 1 : 0 
        const updateQuery = fastify.db.prepare(
          `UPDATE game_settings SET num_games = ?, num_matches = ?, ball_speed = ?, death_timed = ?, time_limit_s = ? WHERE game_id = ?`,
        )
        const updateResult = updateQuery.run(num_games, num_matches, ball_speed, deathTimedInt, time_limit, gameId)
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

        const checksettings = fastify.db.prepare(
          'SELECT * FROM game_settings WHERE game_id = ?'
        )
        const checkSettings = checksettings.get(gameId)
        if (!checkSettings) {
          throw new Error('Game settings not found')
        }
        const totalPlayers = fastify.db.prepare(
          'SELECT COUNT (*) FROM game_players WHERE game_id = ?'
        )
        const totalPlayersCount = totalPlayers.get(gameId)['COUNT (*)']
        if (totalPlayersCount >= checkSettings.max_players) {
          return { error: 'Game is full' }
        }

        const checkPlayer = fastify.db.prepare(
          'SELECT * FROM game_players WHERE game_id = ? AND player_id = ?'
        )
        const existingPlayer = checkPlayer.get(gameId, userId)
        if (existingPlayer) {
          return { error: 'User already joined the game' }
        }

        const query = fastify.db.prepare(
          'INSERT INTO game_players (game_id, player_id) VALUES (?, ?)'
        )
        const result = query.run(gameId, userId)
        if (result.changes === 0) {
          throw new Error('Failed to join game')
        }

        return { message: 'Joined game successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to join game')
      }
    },

    async leaveGame(gameId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ?'
        )
        const checkGame = check.get(gameId)
        if (!checkGame) {
          throw new Error('Game not found')
        }
        console.log('created by:', checkGame.created_by) //! DELETE
        console.log('userId:', userId) //! DELETE
        if (checkGame.created_by === Number(userId)) {
          throw new Error('Creator cannot leave the game')
        }

        const query = fastify.db.prepare(
          'DELETE FROM game_players WHERE game_id = ? AND player_id = ?'
        )
        const result = query.run(gameId, userId)
        if (result.changes === 0) {
          throw new Error('Failed to remove player from game players')
        }

        return { message: 'Left game successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to leave game')
      }
    },

    async createTournament(userId, name, maxPlayers, gameMode, gameType) {
      try {
        fastify.db.exec('BEGIN')

        const query = fastify.db.prepare(
          'INSERT INTO tournaments (created_by, name, status) VALUES (?, ?, ?)'
        )
        const result = query.run(userId, name, "pending")
        if (result.changes === 0) {
          throw new Error('Failed to create tournament')
        }
        const tournamentId = result.lastInsertRowid
        console.log('Tournament created with ID:', tournamentId) //! DELETE

        const tourSettings = fastify.db.prepare(
          'INSERT INTO tournament_settings (tournament_id, game_mode, game_type, max_players) VALUES (?, ?, ?, ?)'
        )
        const tourSettingsResult = tourSettings.run(tournamentId, gameMode, gameType, maxPlayers)
        if (tourSettingsResult.changes === 0) {
          throw new Error('Failed to create tournament settings')
        }
        console.log('Tournament Settings created with ID:', tourSettingsResult.lastInsertRowid) //! DELETE

        const tourPlayersQuery = fastify.db.prepare(
          'INSERT INTO tour_players (tournament_id, user_id) VALUES (?, ?)'
        )
        const tourPlayersResult = tourPlayersQuery.run(tournamentId, userId)
        if (tourPlayersResult.changes === 0) {
          throw new Error('Failed to add user to tournament players')
        }
        console.log('Tournament Players created with ID:', tourPlayersResult.lastInsertRowid) //! DELETE
        fastify.db.exec('COMMIT')        

        // Create game
        const gameId = await fastify.dbGames.createGame(userId, "tournament", maxPlayers, "remote", gameMode)
        if (!gameId) {
          throw new Error('Failed to create game for tournament')
        }
        console.log('Game created for tournament with ID:', gameId) //! DELETE

        return tournamentId
      } catch (err) {
        fastify.log.error(err)
        fastify.db.exec('ROLLBACK')
        throw new Error('Failed to create tournament')
      }
    },

    async joinTournament(tournamentId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          throw new Error('Tournament not found')
        }
        if (checkTournament.status !== 'pending') {
          return { error: 'Tournament is not joinable' }
        }

        const checkSettings = fastify.db.prepare(
          'SELECT * FROM tournament_settings WHERE tournament_id = ?'
        )
        const checkTourSettings = checkSettings.get(tournamentId)
        if (!checkTourSettings) {
          throw new Error('Tournament settings not found')
        }
        const totalPlayers = fastify.db.prepare(
          'SELECT COUNT (*) FROM tour_players WHERE tournament_id = ?'
        )
        const totalPlayersCount = totalPlayers.get(tournamentId)['COUNT (*)']
        if (totalPlayersCount >= checkTourSettings.max_players) {
          return { error: 'Tournament is full' }
        }
        const checkPlayer = fastify.db.prepare(
          'SELECT * FROM tour_players WHERE tournament_id = ? AND user_id = ?'
        )
        const existingPlayer = checkPlayer.get(tournamentId, userId)
        if (existingPlayer) {
          return { error: 'User already joined the tournament' }
        }

        const tourPlayersQuery = fastify.db.prepare(
          'INSERT INTO tour_players (tournament_id, user_id) VALUES (?, ?)'
        )
        const tourPlayersResult = tourPlayersQuery.run(tournamentId, userId)
        if (tourPlayersResult.changes === 0) {
          throw new Error('Failed to add user to tournament players')
        }

        return { message: 'Joined tournament successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to join tournament')
      }
    },

    async leaveTournament(tournamentId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          throw new Error('Tournament not found')
        }
        if (checkTournament.created_by === Number(userId)) {
          throw new Error('Creator cannot leave the tournament')
        }

        const query = fastify.db.prepare(
          'DELETE FROM tour_players WHERE tournament_id = ? AND user_id = ?'
        )
        const result = query.run(tournamentId, userId)
        if (result.changes === 0) {
          throw new Error('Failed to remove player from tournament players')
        }

        return { message: 'Left tournament successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to leave tournament')
      }
    },

    async getTournaments() {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM tournaments'
        )
        const tournaments = query.all()
        if (!tournaments) {
          throw new Error('Failed to retrieve tournaments')
        }
        return tournaments
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournaments')
      }
    },

    async getTournamentById(tournamentId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const tournament = query.get(tournamentId)
        if (!tournament) {
          throw new Error('Tournament not found')
        }
        return tournament
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament')
      }
    },

    async getTournamentPlayers(tournamentId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM tour_players WHERE tournament_id = ?'
        )
        const players = query.all(tournamentId)
        if (!players) {
          throw new Error('Failed to retrieve tournament players')
        }
        return players
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament players')
      }
    },

    async deleteTournament(tournamentId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ? AND created_by = ?'
        )
        const checkTournament = check.get(tournamentId, userId)
        if (!checkTournament) {
          throw new Error('Tournament not found or user not authorized')
        }

        const query = fastify.db.prepare(
          'DELETE FROM tournaments WHERE id = ?'
        )
        const result = query.run(tournamentId)
        if (result.changes === 0) {
          throw new Error('Failed to delete tournament')
        }
        return { message: 'Tournament deleted successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to delete tournament')
      }
    },

    async deleteGame(gameId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ? AND created_by = ?'
        )
        const checkGame = check.get(gameId, userId)
        if (!checkGame) {
          throw new Error('Game not found or user not authorized')
        }

        const query = fastify.db.prepare(
          'DELETE FROM games WHERE id = ?'
        )
        const result = query.run(gameId)
        if (result.changes === 0) {
          throw new Error('Failed to delete game')
        }
        return { message: 'Game deleted successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to delete game')
      }
    },

    async getGamePlayers(gameId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM game_players WHERE game_id = ?'
        )
        const players = query.all(gameId)
        if (!players) {
          throw new Error('Failed to retrieve game players')
        }
        return players
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve game players')
      }
    },

    async startGame(gameId, userId, players) {
      try {
        fastify.db.exec('BEGIN')

        const check = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ? AND created_by = ?'
        )
        const checkGame = check.get(gameId, userId)
        if (!checkGame) {
          throw new Error('Game not found or user not authorized')
        }

        const checkStatus = fastify.db.prepare(
          'SELECT status FROM games WHERE id = ?'
        )
        const gameStatus = checkStatus.get(gameId)
        if (gameStatus.status !== 'pending') {
          throw new Error('Game is not in pending status')
        }

        const startQuery = fastify.db.prepare(
          'UPDATE games SET status = ? WHERE id = ?'
        )
        const result = startQuery.run('active', gameId)
        if (result.changes === 0) {
          throw new Error('Failed to start game')
        }

        const insertMatch = fastify.db.prepare(`
          INSERT INTO game_matches (game_id, status, started) VALUES (?, ?, CURRENT_TIMESTAMP)
        `)
        const matchResult = insertMatch.run(gameId, 'active')
        if (matchResult.changes === 0) {
          throw new Error('Failed to update match status to active')
        }
        const matchId = matchResult.lastInsertRowid
        console.log('Match started with ID:', matchId) //! DELETE


        const updatePlayer = fastify.db.prepare(`
          UPDATE game_players SET paddle_loc  = ?, paddle_side = ? WHERE game_id = ? AND player_id = ?
        `)

        const insertMatchScore = fastify.db.prepare(`
          INSERT INTO match_scores (match_id, player_id) VALUES (?, ?)
        `)

        for (const p of players) {
          const playerId   = p.userId
          const paddleLoc  = p.paddle_loc
          const paddleSide = p.paddle_side

          const updResult = updatePlayer.run(paddleLoc, paddleSide, gameId, playerId)
          if (updResult.changes === 0) {
            throw new Error(`Failed to update paddle for player ${playerId}`)
          }

          const insResult = insertMatchScore.run(matchId, playerId)
          if (insResult.changes === 0) {
            throw new Error(`Failed to add player ${playerId} to match_scores`)
          }
        }
        fastify.db.exec('COMMIT')

        const selectPlayers = fastify.db.prepare(`
           SELECT
              gp.player_id,
              gp.paddle_loc,
              gp.paddle_side,
              u.username
            FROM game_players gp
            JOIN users u ON u.id = gp.player_ids
            WHERE gp.game_id = ?
        `)
        const playerRows = selectPlayers.all(gameId)
        const settingsQuery = fastify.db.prepare(`
           SELECT
              mode,
              game_type,
              game_mode,
              max_players,
              num_games,
              num_matches,
              ball_speed,
              death_timed,
              time_limit_s
            FROM game_settings
            WHERE game_id = ?
        `)
        const settingsRow = settingsQuery.get(gameId)
        return {
          gameId,
          matchId,
          settings: {
            mode:        settingsRow.mode,
            game_type:   settingsRow.game_type,
            game_mode:   settingsRow.game_mode,
            max_players: settingsRow.max_players,
            num_games:   settingsRow.num_games,
            num_matches: settingsRow.num_matches,
            ball_speed:  settingsRow.ball_speed,
            death_timed: Boolean(settingsRow.death_timed),
            time_limit_s: settingsRow.time_limit_s
          },
          players: playerRows
        }
      } catch (err) {
        fastify.log.error(err)
        fastify.db.exec('ROLLBACK')
        throw new Error('Failed to start game')
      }
    }

  })
}, {
  name: 'gameAutoHooks'
})