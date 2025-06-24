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

        //! Create games -> when tournament starts; after seeding the bracket
        // const gameId = await fastify.dbGames.createGame(userId, "tournament", maxPlayers, "remote", gameMode)
        // if (!gameId) {
        //   throw new Error('Failed to create game for tournament')
        // }
        // console.log('Game created for tournament with ID:', gameId) //! DELETE

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

    async getGameDetails(gameId) {
      try {
        const selectPlayers = fastify.db.prepare(`
           SELECT
              gp.player_id,
              gp.paddle_loc,
              gp.paddle_side,
              u.username 
            FROM game_players gp
            JOIN users u ON u.id = gp.player_id
            WHERE gp.game_id = ?
        `)
        const playerRows = selectPlayers.all(gameId)
        const settingsQuery = fastify.db.prepare(`
           SELECT
              gs.mode,
              gs.game_type,
              gs.game_mode,
              gs.max_players,
              gs.num_games,
              gs.num_matches,
              gs.ball_speed,
              gs.death_timed,
              gs.time_limit_s,
              gm.id AS matchId
            FROM game_settings AS gs
            JOIN game_matches gm ON gm.game_id = gs.game_id
            WHERE gs.game_id = ?
        `)
        const settingsRow = settingsQuery.get(gameId)
        return {
          gameId,
          matchId: settingsRow.matchId,
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
        throw new Error('Failed to retrieve game details')
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
          INSERT INTO game_matches (game_id, started) VALUES (?, CURRENT_TIMESTAMP)
        `)
        const matchResult = insertMatch.run(gameId)
        if (matchResult.changes === 0) {
          throw new Error('Failed to create match entry for game')
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
          updatePlayer.run(p.paddle_loc, p.paddle_side, gameId, p.userId)
          insertMatchScore.run(matchId, p.userId)
        }

        const modeRow = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId).mode
        if (modeRow === 'single-player' || modeRow === 'training') {
          const aiId       = fastify.aiUserId
          const humanSide  = players[0].paddle_loc
          const aiSide     = humanSide === 'left' ? 'right' : 'left'

          fastify.db.prepare(`
            INSERT INTO game_players (game_id, player_id, paddle_loc)
            VALUES (?, ?, ?)
          `).run(gameId, aiId, aiSide)
          insertMatchScore.run(matchId, aiId)
        }
        fastify.db.exec('COMMIT')

        return { message: 'Game started successfully' }
      } catch (err) {
        fastify.log.error(err)
        fastify.db.exec('ROLLBACK')
        throw new Error('Failed to start game')
      }
    },

    async updateGameStatus(gameId, matchId, status, stats, userId) {
      try {
        fastify.db.exec('BEGIN')

        const check = fastify.db.prepare(
          'SELECT 1 FROM games WHERE id = ? AND created_by = ?'
        )
        const checkGame = check.get(gameId, userId)
        if (!checkGame) {
          throw new Error('Game not found or user not authorized')
        }

        if (['paused', 'aborted', 'finished'].includes(status)) {
          const updateGame = fastify.db.prepare(`
            UPDATE games
              SET status = ?,
                  updated = CURRENT_TIMESTAMP,
                  ended = CASE WHEN ? = 'finished' THEN CURRENT_TIMESTAMP ELSE ended END
            WHERE id = ?
          `)
          updateGame.run(status, status, gameId)
          fastify.db.exec('COMMIT')
          if (status === 'finished') 
            return { success: true, message: 'Game finished and updated successfully' }
          return 
        }
        const currStatus = fastify.db.prepare(`
          SELECT status FROM games WHERE id = ?
        `).get(gameId).status
        if (status === 'active' && currStatus === 'paused') {
          const updateGame = fastify.db.prepare(`
            UPDATE games
              SET status = ?,
                  updated = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
          updateGame.run(status, gameId)
        }

        if (matchId) {
          const checkMatch = fastify.db.prepare(`
            SELECT 1 FROM game_matches WHERE id = ? AND game_id = ?
          `)
          const matchExists = checkMatch.get(matchId, gameId)
          let matchResult;
          if (matchExists) {
            const updateMatch = fastify.db.prepare(`
            UPDATE game_matches
              SET updated = CURRENT_TIMESTAMP,
                  ended = CURRENT_TIMESTAMP
            WHERE id = ?
            `)
            matchResult = updateMatch.run(matchId)
          } else {
            const prev = fastify.db.prepare(`
              SELECT ended FROM game_matches
              WHERE game_id = ?
              ORDER BY id DESC
              LIMIT 1
            `).get(gameId);
            const createMatch  = fastify.db.prepare(`
              INSERT INTO game_matches (game_id, started, ended) VALUES (?, ?, CURRENT_TIMESTAMP)
            `)
            matchResult = createMatch.run(gameId, prev.ended)
            matchId = matchResult.lastInsertRowid

            const players = fastify.db.prepare(`
              SELECT player_id FROM game_players WHERE game_id = ?
            `).all(gameId)
            const insertMatchScore = fastify.db.prepare(`
              INSERT INTO match_scores (match_id, player_id) VALUES (?, ?)
            `)
            for (const player of players) {
              const playerId = player.player_id
              const insResult = insertMatchScore.run(matchId, playerId)
              if (insResult.changes === 0) {
                throw new Error(`Failed to add player ${playerId} to match_scores`)
              }
            }
          }
          if (matchResult.changes === 0) {
            throw new Error('Failed to update match status')
          }
        }
        if (stats?.hits) {
          const updateStats = fastify.db.prepare(`
            UPDATE match_scores
              SET hits = hits + ?
            WHERE match_id = ? AND player_id = ?
          `)
          for (const [PlayerId, hits] of Object.entries(stats.hits)) {
            const statsResult = updateStats.run(hits, matchId, Number(PlayerId))
            if (statsResult.changes === 0) {
              throw new Error(`Failed to update stats for player ${PlayerId}`)
            }
          }
        }
        if (stats?.scores) {
          const updateScores = fastify.db.prepare(`
            UPDATE match_scores
              SET score = score + ?
            WHERE match_id = ? AND player_id = ?
          `)
          for (const [PlayerId, score] of Object.entries(stats.scores)) {
            const scoresResult = updateScores.run(score, matchId, PlayerId)
            if (scoresResult.changes === 0) {
              throw new Error(`Failed to update scores for player ${PlayerId}`)
            }
          }
        }

        fastify.db.exec('COMMIT')
        return { success: true, message: 'Game status updated successfully' }
      } catch (err) {
        fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to update game status')
      }
    },

    async getGameSummary(gameId) {
      const summary = fastify.db.prepare(`
        SELECT
          games.id AS gameId,
          games.created,
          games.ended,
          (strftime('%s', games.ended)  - strftime('%s', games.created)) AS duration,
          games.status,
          MAX(CASE WHEN game_players.paddle_loc = 'left' THEN users.username END) AS leftPlayer,
          MAX(CASE WHEN game_players.paddle_loc = 'right' THEN users.username END) AS rightPlayer,
          SUM(match_scores.score) FILTER (WHERE game_players.paddle_loc = 'left') AS totalScoreLeft,
          SUM(match_scores.score) FILTER (WHERE game_players.paddle_loc = 'right') AS totalScoreRight
        FROM games
        JOIN game_matches ON game_matches.game_id = games.id
        JOIN match_scores ON match_scores.match_id = game_matches.id
        JOIN game_players ON game_players.game_id   = games.id
        AND game_players.player_id = match_scores.player_id
        JOIN users ON users.id = game_players.player_id
        WHERE  games.id = ?
        GROUP  BY games.id;
      `).get(gameId)

      const matches = fastify.db.prepare(`
        SELECT
          game_matches.id AS matchId,
          game_matches.started,
          game_matches.ended,
          (strftime('%s', game_matches.ended) - strftime('%s', game_matches.started)) AS duration,
          MAX(CASE WHEN game_players.paddle_loc = 'left' THEN users.username END) AS leftPlayer,
          SUM(CASE WHEN game_players.paddle_loc = 'left' THEN match_scores.score END) AS scoreLeft,
          SUM(CASE WHEN game_players.paddle_loc = 'left' THEN match_scores.hits  END) AS hitsLeft,
          MAX(CASE WHEN game_players.paddle_loc = 'right' THEN users.username END) AS rightPlayer,
          SUM(CASE WHEN game_players.paddle_loc = 'right' THEN match_scores.score END) AS scoreRight,
          SUM(CASE WHEN game_players.paddle_loc = 'right' THEN match_scores.hits  END) AS hitsRight
        FROM game_matches
        JOIN match_scores ON match_scores.match_id = game_matches.id
        JOIN game_players ON game_players.game_id = game_matches.game_id
        AND game_players.player_id = match_scores.player_id
        JOIN users ON users.id = game_players.player_id
        WHERE game_matches.game_id = ?
        GROUP BY game_matches.id
        ORDER BY game_matches.started;
      `).all(gameId)

      const matchesWonByLeft  = matches.filter(m => m.scoreLeft  > m.scoreRight).length;
      const matchesWonByRight = matches.filter(m => m.scoreRight > m.scoreLeft ).length;

      return {
        gameId:           summary.gameId,
        created:          summary.created,
        ended:            summary.ended,
        duration:         summary.duration,
        status:           summary.status,
        leftPlayer:       summary.leftPlayer,
        rightPlayer:      summary.rightPlayer,
        matchesWonByLeft: matchesWonByLeft,
        matchesWonByRight: matchesWonByRight,
        finalScoreLeft:   summary.totalScoreLeft,
        finalScoreRight:  summary.totalScoreRight,
        matches: matches.map(m => ({
          matchId:     m.matchId,
          duration:    m.duration,
          started:     m.started,
          ended:       m.ended,
          leftPlayer:  m.leftPlayer,
          scoreLeft:   m.scoreLeft,
          hitsLeft:    m.hitsLeft,
          rightPlayer: m.rightPlayer,
          scoreRight:  m.scoreRight,
          hitsRight:   m.hitsRight
        }))
      }
    },


    async startTournament(tournamentId, userId) {
      try{
        fastify.db.exec('BEGIN')
        
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ? AND created_by = ?'
        )
        const checkResult = check.get(tournamentId, userId)
        if (!checkResult) {
          throw new Error('Tournament not found or user not authorized')
        }
        if (checkResult.status !== 'pending') {
          throw new Error('Tournament is not in pending status')
        }
        fastify.db.exec('COMMIT')
        await fastify.dbGames.seedBracket(tournamentId);
        const updateTournament = fastify.db.prepare(`
          UPDATE tournaments
            SET 
              status = ?,
              started = CURRENT_TIMESTAMP,  
              updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        const result = updateTournament.run('active', tournamentId)
        if (result.changes === 0) {
          throw new Error('Failed to start tournament')
        }
        return { success: true, message: 'Tournament started successfully' }
      } catch (err) {
        fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to start tournament')
      }
    },

    async pairOffPlayers (players) {
      try {
        const shuffledPlayers = players.sort(() => Math.random() - 0.5)
        const pairs = []
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
          if (i + 1 < shuffledPlayers.length) {
            pairs.push([shuffledPlayers[i], shuffledPlayers[i + 1]])
          } else {
            pairs.push([shuffledPlayers[i], null]) // Odd player without a pair
          }
        }
        return pairs
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to pair off players')
      }
    },

    async seedBracket(tournamentId) {
      try {
        fastify.db.exec('BEGIN')
        const players = fastify.db.prepare(
          'SELECT user_id FROM tour_players WHERE tournament_id = ?'
        ).all(tournamentId).map(p => p.user_id)

        if (players.length < 2) {
          throw new Error('Not enough players to seed the bracket')
        }

        if (players.length !== 4 && players.length !== 8 && players.length !== 16) {
          throw new Error('Invlaid number of tournament players, cannot seed bracket')
        }

        const tourConfig = fastify.db.prepare(
          'SELECT * FROM tournament_settings WHERE tournament_id = ?'
        ).get(tournamentId)
        if (!tourConfig) {
          throw new Error('Tournament settings not found')
        }


        const pairs = await fastify.dbGames.pairOffPlayers(players)

        const insertMatch = fastify.db.prepare(`
          INSERT INTO tournament_games (tournament_id, game_id, round) VALUES (?, ?, 1)
        `)

        fastify.db.exec('COMMIT')

        for (const [player1, player2] of pairs) {
          const gameId = await fastify.dbGames.createGame(
            player1, 'tournament', 2, 'local', tourConfig.game_mode
          )
          if (!gameId) {
            throw new Error('Failed to create game for tournament match')
          }
          fastify.db.prepare(
            'INSERT INTO game_players (game_id, player_id) VALUES (?, ?)'
          ).run(gameId, player2)
          fastify.db.prepare(
            'UPDATE game_settings SET num_games = ?, num_matches = ?, ball_speed = ?, death_timed = ?, time_limit_s = ? WHERE game_id = ?'
          ).run(tourConfig.num_games, tourConfig.num_matches, tourConfig.ball_speed, tourConfig.death_timed, tourConfig.time_limit_s, gameId)
      
          insertMatch.run(tournamentId, gameId)
        }
        return { success: true, message: 'Tournament bracket seeded successfully' }
      } catch (err) {
        fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to seed tournament bracket')
      }
    },

    async updateTournamentOptions(tournamentId, userId, num_games, num_matches, ball_speed, death_timed, time_limit) {
      try {
        fastify.db.exec('BEGIN')
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ? AND created_by = ?'
        )
        const checkTournament = check.get(tournamentId, userId)
        if (!checkTournament) {
          throw new Error('Tournament not found or user not authorized')
        }

        const deathTimedInt = death_timed ? 1 : 0 
        const updateQuery = fastify.db.prepare(
          `UPDATE tournament_settings SET num_games = ?, num_matches = ?, ball_speed = ?, death_timed = ?, time_limit_s = ? WHERE tournament_id = ?`,
        )
        const updateResult = updateQuery.run(num_games, num_matches, ball_speed, deathTimedInt, time_limit, tournamentId)
        if (updateResult.changes === 0) {
          throw new Error('Failed to update game options')
        }
        fastify.db.exec('COMMIT')
        return { message: 'Tournament options updated successfully' }
      } catch (err) {
        fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to update tournament options')
      }
    }

  })
}, {
  name: 'gameAutoHooks'
})