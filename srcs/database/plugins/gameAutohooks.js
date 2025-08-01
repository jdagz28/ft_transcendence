'use strict'

const fp = require('fastify-plugin')
const schemas = require('../routes/games/schemas/loader')
const axios = require('axios');

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
        if (!fastify.db.inTransaction) { //! DELETE
          fastify.log.info('Transaction committed successfully') //! DELETE
        }
        return gameId
      } catch (err) {
        if (fastify.db.inTransaction) {
          fastify.db.exec('ROLLBACK')
        }
        fastify.log.error(err)
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

    async joinGame(gameId, userId, slot) {
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
          return { error: 'Game settings not found' }
        }
        const isInvited = fastify.db.prepare(
          'SELECT * FROM game_invites WHERE game_id = ? AND user_id = ? AND status = ?'
        ).get(gameId, userId, 'accepted')

        if (checkSettings.mode === 'private' && !isInvited) {
          return { error: 'User is not invited to the game' }
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
          'INSERT INTO game_players (game_id, player_id, slot) VALUES (?, ?, ?)'
        )
        const result = query.run(gameId, userId, slot)
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
        let query
        const check = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (check.mode === 'tournament') {
          query = fastify.db.prepare(`
            SELECT
              game_players.player_id,
              game_players.paddle_loc,
              game_players.paddle_side,
              users.username,
              tournament_aliases.alias
            FROM game_players
            JOIN users ON users.id = game_players.player_id
            JOIN tournament_games ON tournament_games.game_id = game_players.game_id
            LEFT JOIN 
              tournament_aliases ON tournament_aliases.user_id = game_players.player_id AND tournament_aliases.tournament_id = tournament_games.tournament_id
            WHERE game_players.game_id = ?
          `)
        } else {
          query = fastify.db.prepare(`
            SELECT
              game_players.player_id,
              game_players.paddle_loc,
              game_players.paddle_side,
              game_players.slot,
              users.username
            FROM game_players 
            JOIN users ON users.id = game_players.player_id
            WHERE game_id = ?
          `)
        }
        const players = query.all(gameId)
        if (!players) {
          return []
        }
        const baseURL =  "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT
        for (const player of players) {
          player.avatar = `${baseURL}/users/${player.player_id}/avatar`
          if (check.mode === 'tournament') {
            player.alias = player.alias || player.username
          }
        }
        return players
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve game players')
      }
    },

    async getGameDetails(gameId, userId) {
      try {
        let query
        const checkTournament = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (checkTournament.mode !== 'tournament') {
          const check = fastify.db.prepare(
            'SELECT * FROM games WHERE id = ? AND created_by = ?'
          )
          const checkGame = check.get(gameId, userId)
          if (!checkGame) {
            throw new Error('Game not found or user not authorized')
          }
        }
        if (checkTournament.mode === 'tournament') {
          query = fastify.db.prepare(`
            SELECT
              tournaments.created_by AS created_by
            FROM tournament_games
            JOIN tournaments ON tournaments.id = tournament_games.tournament_id
            WHERE tournament_games.game_id = ?
          `)
          const creatorId = query.get(gameId)
          
          const playerCheck = fastify.db.prepare(`
            SELECT player_id FROM game_players WHERE game_id = ? AND player_id = ?
          `).get(gameId, userId)
          if (creatorId.created_by !== Number(userId) && !playerCheck) {
            throw new Error('User not authorized')
          }
        }

        const selectPlayers = fastify.db.prepare(`
           SELECT
              game_players.player_id,
              game_players.paddle_loc,
              game_players.paddle_side,
              users.username 
            FROM game_players
            JOIN users ON users.id = game_players.player_id
            WHERE game_players.game_id = ?
        `)
        const playerRows = selectPlayers.all(gameId)
        const settingsQuery = fastify.db.prepare(`
           SELECT
              game_settings.mode,
              game_settings.game_type,
              game_settings.game_mode,
              game_settings.max_players,
              game_settings.num_games,
              game_settings.num_matches,
              game_settings.ball_speed,
              game_settings.death_timed,
              game_settings.time_limit_s,
              game_matches.id AS matchId
            FROM game_settings
            JOIN game_matches ON game_matches.game_id = game_settings.game_id
            WHERE game_settings.game_id = ?
        `)
        const settingsRow = settingsQuery.get(gameId)
        const status = fastify.db.prepare('SELECT * FROM games WHERE id = ?').get(gameId)
        return {
          gameId,
          status: status.status,
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
        let query
        const checkTournament = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (checkTournament.mode !== 'tournament') {
          const check = fastify.db.prepare(
            'SELECT * FROM games WHERE id = ? AND created_by = ?'
          )
          const checkGame = check.get(gameId, userId)
          if (!checkGame) {
            throw new Error('Game not found or user not authorized')
          }
        }
        if (checkTournament.mode === 'tournament') {
          query = fastify.db.prepare(`
            SELECT
              tournaments.created_by AS created_by
            FROM tournament_games
            JOIN tournaments ON tournaments.id = tournament_games.tournament_id
            WHERE tournament_games.game_id = ?
          `)
          const creatorId = query.get(gameId)
          
          const playerCheck = fastify.db.prepare(`
            SELECT player_id FROM game_players WHERE game_id = ? AND player_id = ?
          `)
          let playerExist;
          for (const p of players) {
            playerExist = playerCheck.get(gameId, p.userId)
          }
          if (creatorId.created_by !== Number(userId) && !playerExist) {
            throw new Error('User not authorized')
          }
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
      let transactionActive = false;
      
      try {
        fastify.db.exec('BEGIN')
        transactionActive = true;
        
        const checkTournament = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        
        if (checkTournament.mode !== 'tournament') {
          const check = fastify.db.prepare(
            'SELECT * FROM games WHERE id = ? AND created_by = ?'
          )
          const checkGame = check.get(gameId, userId)
          if (!checkGame) {
            throw new Error('Game not found or user not authorized')
          }
        } else {
          const query = fastify.db.prepare(`
            SELECT tournaments.created_by AS created_by
            FROM tournament_games
            JOIN tournaments ON tournaments.id = tournament_games.tournament_id
            WHERE tournament_games.game_id = ?
          `)
          const creatorId = query.get(gameId)
          
          const playerCheck = fastify.db.prepare(`
            SELECT player_id FROM game_players WHERE game_id = ? AND player_id = ?
          `)
          const players = fastify.db.prepare(`
            SELECT player_id FROM game_players WHERE game_id = ?
          `).all(gameId)

          const playerExist = playerCheck.get(gameId, userId)
          
          if (creatorId.created_by !== Number(userId) && !playerExist) {
            throw new Error('User not authorized')
          }
        }


        if (status === 'paused' || status === 'aborted') {
          const updateGame = fastify.db.prepare(`
            UPDATE games
              SET status = ?,
                  updated = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
          updateGame.run(status, gameId)
          
          fastify.db.exec('COMMIT')
          transactionActive = false;
          return { success: true, message: `Game ${status} successfully` }
        }
        if (status === 'finished') {
          const updateGame = fastify.db.prepare(`
            UPDATE games
              SET status = ?,
                  updated = CURRENT_TIMESTAMP,
                  ended = CURRENT_TIMESTAMP
            WHERE id = ?
          `)
          updateGame.run(status, gameId)
        }
        
        if (status === 'active') {
          const currStatus = fastify.db.prepare(`
            SELECT status FROM games WHERE id = ?
          `).get(gameId)?.status
          
          if (currStatus === 'paused') {
            const updateGame = fastify.db.prepare(`
              UPDATE games
                SET status = ?,
                    updated = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
            updateGame.run(status, gameId)
          }
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
            const createMatch = fastify.db.prepare(`
              INSERT INTO game_matches (game_id, started, ended) VALUES (?, ?, CURRENT_TIMESTAMP)
            `)
            matchResult = createMatch.run(gameId, prev?.ended)
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

        let topScore = 0;
        let winnerId = null;
        if (stats?.hits) {
          const updateStats = fastify.db.prepare(`
            UPDATE match_scores
              SET hits = hits + ?
            WHERE match_id = ? AND player_id = ?
          `)

          for (const [playerId, hits] of Object.entries(stats.hits)) {
            const statsResult = updateStats.run(hits, matchId, Number(playerId))
            if (statsResult.changes === 0) {
              throw new Error(`Failed to update stats for player ${playerId}`)
            }
          }
        }
        if (stats?.scores) {
          const updateScores = fastify.db.prepare(`
            UPDATE match_scores
              SET score = score + ?
            WHERE match_id = ? AND player_id = ?
          `)
          for (const [playerId, scoreValue] of Object.entries(stats.scores)) {
            const scoresResult = updateScores.run(scoreValue, matchId, playerId)
            if (scoresResult.changes === 0) {
              throw new Error(`Failed to update scores for player ${playerId}`)
            }
            
            const currentScore = fastify.db.prepare(`
              SELECT score FROM match_scores WHERE match_id = ? AND player_id = ?
            `).get(matchId, playerId).score;
            
            if (currentScore > topScore) {
              topScore = currentScore;
              winnerId = Number(playerId);
            }
          }
        }

        if (winnerId !== null) {
          fastify.db.prepare(`
            UPDATE games
              SET winner_id = ?
            WHERE id = ?
          `).run(winnerId, gameId)
          fastify.db.prepare(`
            UPDATE game_matches
              SET winner_id = ?
            WHERE id = ?
          `).run(winnerId, matchId)
        }

        fastify.db.exec('COMMIT')
        transactionActive = false;

        if (status === 'finished' && checkTournament.mode === 'tournament') {
          try {
            await fastify.dbTournaments.onGameFinished(gameId)
          } catch (tournamentError) {
            fastify.log.error('Tournament processing failed:', tournamentError)
          }
        }

        return { success: true, message: 'Game status updated successfully' }
      } catch (err) {
        if (transactionActive) {
          try {
            fastify.db.exec('ROLLBACK')
          } catch (rollbackErr) {
            fastify.log.warn('Rollback failed:', rollbackErr.message)
          }
        }
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

    async isTourAdmin(gameId, userId) {
      try {
        const query = fastify.db.prepare(`
          SELECT 1 FROM tournament_games
          JOIN tournaments ON tournaments.id = tournament_games.tournament_id
          WHERE tournament_games.game_id = ? AND tournaments.created_by = ?
        `)
        const result = query.get(gameId, userId)
        if (result) 
          return true
        return false
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to check tournament admin status')
      }
    },

    async getGameOptions(gameId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM game_settings WHERE game_id = ?'
        )
        const options = query.get(gameId)
        if (!options) {
          throw new Error('Game options not found')
        }
        const status = fastify.db.prepare(
          'SELECT status FROM games WHERE id = ?'
        ).get(gameId)

        return {
          mode:        options.mode,
          status:      status.status,
          game_type:   options.game_type,
          game_mode:   options.game_mode,
          max_players: options.max_players,
          num_games:   options.num_games,
          num_matches: options.num_matches,
          ball_speed:  options.ball_speed,
          death_timed: Boolean(options.death_timed),
          time_limit_s: options.time_limit_s
        }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve game options')
      }
    },

    async getLeaderboardStats(userId) {
      try {
        const leaderboardQuery = fastify.db.prepare(`
          SELECT 
            users.id as userId,
            users.username,
            COUNT(games.id) as totalGames,
            SUM(CASE WHEN games.winner_id = users.id THEN 1 ELSE 0 END) as wins,
            COUNT(games.id) - SUM(CASE WHEN games.winner_id = users.id THEN 1 ELSE 0 END) as losses,
            CASE 
              WHEN COUNT(games.id) = 0 THEN 0 
              ELSE ROUND(CAST(SUM(CASE WHEN games.winner_id = users.id THEN 1 ELSE 0 END) AS FLOAT) / COUNT(games.id) * 100, 2) 
            END as winPercentage
          FROM users
          LEFT JOIN game_players ON users.id = game_players.player_id
          LEFT JOIN games ON game_players.game_id = games.id AND games.status = 'finished'
          WHERE users.id != 1
          GROUP BY users.id, users.username
          HAVING COUNT(games.id) > 0
          ORDER BY wins DESC, winPercentage DESC
        `)
        const results = leaderboardQuery.all()
        const baseURL = "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT;

        return results.map(user => ({
          ...user,
          avatar: `${baseURL}/users/${user.userId}/avatar`
        }))
      } catch(err) {
        fastify.log.error(err)
        throw new Error('Failed to get leaderboard stats')
      }
    },

    async inviteToGame(gameId, userId, inviter, slot) {
      try {
        const query = fastify.db.prepare(`
          INSERT INTO game_invites (game_id, user_id, inviter_id, slot)
          VALUES (?, ?, ?, ?)
        `)
        const result = query.run(gameId, userId, inviter, slot)
        if (result.changes === 0) {
          throw new Error('Failed to invite user to game')
        }
        
        const id = await fastify.notifications.gameInvite(inviter, userId, gameId)

        await axios.post(`http://chat:${process.env.CHAT_PORT}/internal/game-invite`, {
          gameId: gameId,
          senderId: inviter,
          receiverId: userId,
          notifId: id
        })
        
        return { message: `Game invite sent successfully to ${userId}` }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to invite user to game')
      }
    },

    async respondToInvite(gameId, userId, response) {
      try {
        const query = fastify.db.prepare(`
          SELECT * FROM game_invites
          WHERE game_id = ? AND user_id = ? AND status = 'pending'
        `)
        const invite = query.get(gameId, userId)

        if (!invite) {
          throw new Error('Invite not found or already responded')
        }

        const gameStatus = fastify.db.prepare(`
          SELECT status FROM games WHERE id = ?
        `).get(gameId)
        
        if (gameStatus.status !== 'pending') {
          throw new Error('Game is not joinable')
        }

        const updateQuery = fastify.db.prepare(`
          UPDATE game_invites SET status = ? WHERE id = ?
        `)
        const newStatus = response === 'accept' ? 'accepted' : 'rejected'
        const result = updateQuery.run(newStatus, invite.id)
        if (result.changes === 0) {
          throw new Error('Failed to update invite status')
        }
        
        if (response === 'accept') {
          await fastify.dbGames.joinGame(gameId, userId, invite.slot)
        }

        try {
          const accepterName = fastify.db.prepare('SELECT username FROM users WHERE id = ?').get(userId)
          await axios.post(`http://chat:${process.env.CHAT_PORT}/internal/game-responded`, {
            requesterId: friendId,
            accepterId: userId,
            accepterName: accepterName.username
          }, {
            timeout: 3000
          });
        } catch (err) {
          console.error(`Failed to send WebSocket notification for game invite`);
        }

        return { message: `Invite ${newStatus} successfully` }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to respond to invite')
      }
    },

    async getGameInvites(userId) {
      try {
        const query = fastify.db.prepare(`
          SELECT game_invites.id, game_invites.game_id, game_invites.inviter_id, games.status, games.created
          FROM game_invites
          JOIN games ON games.id = game_invites.game_id
          WHERE game_invites.user_id = ? AND game_invites.status = 'pending'
        `)
        const invites = query.all(userId)
        if (!invites) {
          return []
        }
        return invites.map(invite => ({
          ...invite,
          created: new Date(invite.created).toISOString()
        }))
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve game invites')
      }
    },

    async updateInGameStatus(userId, gameId, status) {
      try {
        let query
        const checkTournament = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (checkTournament.mode !== 'tournament') {
          const check = fastify.db.prepare(
            'SELECT * FROM games WHERE id = ? AND created_by = ?'
          )
          const checkGame = check.get(gameId, userId)
          if (!checkGame) {
            throw new Error('Game not found or user not authorized')
          }
        }
        if (checkTournament.mode === 'tournament') {
          query = fastify.db.prepare(`
            SELECT
              tournaments.created_by AS created_by
            FROM tournament_games
            JOIN tournaments ON tournaments.id = tournament_games.tournament_id
            WHERE tournament_games.game_id = ?
          `)
          const creatorId = query.get(gameId)
          
          const playerCheck = fastify.db.prepare(`
            SELECT player_id FROM game_players WHERE game_id = ? AND player_id = ?
          `).get(gameId, userId)
          if (creatorId.created_by !== Number(userId) && !playerCheck) {
            throw new Error('User not authorized')
          }
        }

        const updateQuery = fastify.db.prepare(
          'UPDATE games SET status = ? WHERE id = ?'
        )
        const result = updateQuery.run(status, gameId)
        if (result.changes === 0) {
          throw new Error('Failed to update in-game status')
        }
        return { message: 'In-game status updated successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to update in-game status')
      }
    },

    async getTournamentId(gameId) {
      try {
        const query = fastify.db.prepare(`
          SELECT tournament_id FROM tournament_games WHERE game_id = ?
        `)
        const result = query.get(gameId)
        if (!result) {
          console.log('No tournament found for game ID:', gameId) //! DELETE
          return null
        }
        return result.tournament_id
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament ID')
      }
    }


  })
}, {
  name: 'gameAutoHooks',
  dependencies: ['tournamentAutoHooks', 'notificationPlugin']
})
