'use strict'

const fp = require('fastify-plugin')
const schemas = require('../routes/games/schemas/loader')
const axios = require('axios');

module.exports = fp(async function gameAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('dbGames', {
    
    // Creates a new game record, its associated settings, and adds the creator as the first player.
    async createGame(userId, mode, maxPlayers, gameType, gameMode) {
      try {
        fastify.db.exec('BEGIN')

        const query = fastify.db.prepare(
          'INSERT INTO games (created_by, status) VALUES (?, ?)'
        )
        const result = query.run(userId,'pending')
        if (result.changes === 0) {
          throw new Error('Failed to create game')
        }
        const gameId = result.lastInsertRowid

        const query1 = fastify.db.prepare(
          'INSERT INTO game_settings (game_id, mode, game_type, game_mode, max_players) VALUES (?, ?, ?, ?, ?)'
        )
        const result1 = query1.run(gameId, mode, gameType, gameMode, maxPlayers)
        if (result1.changes === 0) {
          throw new Error('Failed to create game settings')
        }

        const query4 = fastify.db.prepare(
          'INSERT INTO game_players (game_id, player_id) VALUES (?, ?)'
        )
        const result4 = query4.run(gameId, userId)
        if (result4.changes === 0) {
          throw new Error('Failed to add user to game players')
        }
        fastify.db.exec('COMMIT')

        return gameId
      } catch (err) {
        if (fastify.db.inTransaction) {
          fastify.db.exec('ROLLBACK')
        }
        fastify.log.error(err)
        throw new Error('Failed to create game')
      }
    },

    // Modifies game settings for a pending game.
    async updateGameOptions(gameId, userId, num_games, num_matches, ball_speed, death_timed, time_limit) {
      try {
        const gameQuery = fastify.db.prepare('SELECT created_by FROM games WHERE id = ?');
        const game = gameQuery.get(gameId);
        if (!game) {
          return { error: 'Game not found', status: 404 };
        }
        if (game.created_by !== Number(userId)) {
          return { error: 'User not authorized to modify this game', status: 403 };
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

    // Retrieves a list of all games.
    async getGames() {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM games'
        )
        const games = query.all()

        return games
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve games')
      }
    },

    // Retrieves the basic details for a single game by its ID.
    // Only entries from the `games` table are returned.
    async getGameById(gameId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ?'
        )
        const game = query.get(gameId)
        if (!game) {
          return { error: 'Game not found', status: 404 }
        }
        return game
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve game')
      }
    },

    // Adds a player to an existing and joinable/pending game.
    async joinGame(gameId, userId, slot) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ?'
        )
        const checkGame = check.get(gameId)
        if (!checkGame) {
          return { error: 'Game not found', status: 404 }
        }
        if (checkGame.status !== 'pending') {
          return { error: 'Game is not joinable', status: 409 }
        }

        const checksettings = fastify.db.prepare(
          'SELECT * FROM game_settings WHERE game_id = ?'
        )
        const checkSettings = checksettings.get(gameId)
        if (!checkSettings) {
          return { error: 'Game settings not found', status: 404 }
        }
        const isInvited = fastify.db.prepare(
          'SELECT * FROM game_invites WHERE game_id = ? AND user_id = ? AND status = ?'
        ).get(gameId, userId, 'accepted')

        if (checkSettings.mode === 'private' && !isInvited) {
          return { error: 'User is not invited to the game', status: 403 }
        }

        const totalPlayers = fastify.db.prepare(
          'SELECT COUNT (*) FROM game_players WHERE game_id = ?'
        )
        const totalPlayersCount = totalPlayers.get(gameId)['COUNT (*)']
        if (totalPlayersCount >= checkSettings.max_players) {
          return { error: 'Game is full', status: 409 }
        }

        const checkPlayer = fastify.db.prepare(
          'SELECT * FROM game_players WHERE game_id = ? AND player_id = ?'
        )
        const existingPlayer = checkPlayer.get(gameId, userId)
        if (existingPlayer) {
          return { error: 'User already joined the game', status: 409 }
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

    // Removes a player from a game.
    // The creator of the game cannot leave.
    async leaveGame(gameId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM games WHERE id = ?'
        )
        const checkGame = check.get(gameId)
        if (!checkGame) {
          return { error: 'Game not found', status: 404 }
        }
        if (checkGame.created_by === Number(userId)) {
          return { error: 'Creator cannot leave the game', status: 403 }
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

    // Deletes a game if the user is the creator.
    async deleteGame(gameId, userId) {
      try {
        const gameQuery = fastify.db.prepare('SELECT * FROM games WHERE id = ?');
        const game = gameQuery.get(gameId);
        if (!game) {
          return { error: 'Game not found', status: 404 };
        }
        if (game.created_by !== Number(userId)) {
          return { error: 'User not authorized to modify this game', status: 403 };
        }

        if (game.status !== 'pending') {
          return { error: 'Game can no longer be deleted', status: 400 }
        }
        
        const checkPendingInvites = fastify.db.prepare(
          'SELECT * FROM game_invites WHERE game_id = ?'
        )
        const pendingInvites = checkPendingInvites.all(gameId)
        if (pendingInvites.length > 0) {
          for (const invite of pendingInvites) {
            console.log(`Deleting invite for user ${invite.user_id} in game ${gameId}`); //! DELETE
            await fastify.notifications.gameDeleted(gameId, invite.user_id)
          }
          const deleteInvites = fastify.db.prepare(
            'DELETE FROM game_invites WHERE game_id = ?'
          )
          deleteInvites.run(gameId)
        }

        const query = fastify.db.prepare(
          'DELETE FROM games WHERE id = ?'
        )
        const result = query.run(gameId)
        if (result.changes === 0) {
          throw new Error('Failed to delete game')
        }
        
        const deleteNotifications = fastify.db.prepare(
          'DELETE FROM notifications WHERE type = ? AND type_id = ?'
        )
        deleteNotifications.run('game.invite', gameId)

        const deleteInviteMessages = fastify.db.prepare(`
          DELETE FROM messages WHERE content LIKE ? AND content LIKE ?
        `);
        deleteInviteMessages.run('%game.invite%', `%gameId":${gameId}%`);

        return { message: 'Game deleted successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to delete game')
      }
    },

    // Retrieves a list of players and their details for a specific game.
    async getGamePlayers(gameId) {
      try {
        let query
        const check = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (!check) {
          return { error: 'Game not found', status: 404 }
        }
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
        if (players.length === 0) {
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

    // Game Details or Game Configuration
    // Comprehensive details about the game to iniitialize the game proper
    async getGameDetails(gameId, userId) {
      try {
        let query
        const checkTournament = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (!checkTournament) {
          return { error: 'Game not found', status: 404 }
        }
        if (checkTournament.mode !== 'tournament') {
          const gameQuery = fastify.db.prepare('SELECT created_by FROM games WHERE id = ?');
          const game = gameQuery.get(gameId);
          if (!game) {
            return { error: 'Game not found', status: 404 };
          }
          if (game.created_by !== Number(userId)) {
            return { error: 'User not authorized to modify this game', status: 403 };
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
            return { error: 'User not authorized', status: 403 }
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
        
        if (!settingsRow || !status) {
          return { error: 'Game settings or status not found', status: 404 }
        }
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

    // Starts the game by updating its status to 'active'. Ready for play.
    // Creates a match entry and updates player paddles.
    async startGame(gameId, userId, players) {
      try {
        fastify.db.exec('BEGIN')
        let query
        const checkTournament = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (!checkTournament) {
          return { error: 'Game not found', status: 404 }
        }
        if (checkTournament.mode !== 'tournament') {
          const gameQuery = fastify.db.prepare('SELECT created_by FROM games WHERE id = ?');
          const game = gameQuery.get(gameId);
          if (!game) {
            return { error: 'Game not found', status: 404 };
          }
          if (game.created_by !== Number(userId)) {
            return { error: 'User not authorized to modify this game', status: 403 };
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
            return { error: 'User not authorized', status: 403 }
          }
        }

        const checkStatus = fastify.db.prepare(
          'SELECT status FROM games WHERE id = ?'
        )
        const gameStatus = checkStatus.get(gameId)
        if (gameStatus.status !== 'pending') {
          return { error: 'Game is not in pending status', status: 400 }
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

        const settings = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (!settings) {
          return { error: 'Game settings not found', status: 404 }
        }
        const modeRow = settings.mode
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

    // Updates the game's status (finished, paused aborted) and player stats
    async updateGameStatus(gameId, matchId, status, stats, userId) {
      let transactionActive = false;      
      try {
        fastify.db.exec('BEGIN')
        transactionActive = true;
        
        const checkTournament = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (!checkTournament) {
          return { error: 'Game settings not found', status: 404 }
        }

        if (checkTournament.mode !== 'tournament') {
          const gameQuery = fastify.db.prepare('SELECT created_by FROM games WHERE id = ?');
          const game = gameQuery.get(gameId);
          if (!game) {
            return { error: 'Game not found', status: 404 };
          }
          if (game.created_by !== Number(userId)) {
            return { error: 'User not authorized to modify this game', status: 403 };
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
            return { error: 'User not authorized', status: 403 }
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

    // Generates a summary of the game
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

      if (!summary || !matches) {
        return { error: 'Game summary not found' }
      }

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

    // Check if the current user is the creator of the tournament associated with the game.
    async isTourAdmin(gameId, userId) {
      try {  
        const check = fastify.db.prepare(
          `SELECT * FROM tournament_games WHERE game_id = ?`
        ).get(gameId)
        if (!check) {
          return { error: 'Game not found or not associated with a tournament', status: 404 }
        }

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

    // Get the game options for a specific game.
    async getGameOptions(gameId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM game_settings WHERE game_id = ?'
        )
        const options = query.get(gameId)
        if (!options) {
          return { error: 'Game options not found', status: 404 }
        }
        const status = fastify.db.prepare(
          'SELECT status FROM games WHERE id = ?'
        ).get(gameId)
        if (!status) {
          return { error: 'Game status not found', status: 404 }
        }

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

    // Calculates player stats for the leaderboard
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

    // Invites a user to a game.
    async inviteToGame(gameId, userId, inviter, slot) {
      try {
        const existingInvite = fastify.db.prepare(`
          SELECT id, status FROM game_invites WHERE game_id = ? AND user_id = ?
        `).get(gameId, userId);

        if (existingInvite) {
          const gamePlayer = fastify.db.prepare(`
            SELECT player_id FROM game_players WHERE game_id = ? AND player_id = ?
          `).get(gameId, userId);

          if (existingInvite.status === 'pending') {
            return { error: 'An invite is already pending for this user.', status: 409 };
          } else if (existingInvite.status === 'accepted' && gamePlayer) {
            return { error: 'User has already joined the game.', status: 409 };
          } else {
            const update = fastify.db.prepare(`
              UPDATE game_invites SET status = 'pending', inviter_id = ?, slot = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `);
            const result = update.run(inviter, slot, existingInvite.id);
            if (result.changes === 0) {
              throw new Error('Failed to update existing invite');
            }

            const id = await fastify.notifications.gameInvite(inviter, userId, gameId);
            const roomId = await fastify.dbChat.createDirectMessage(inviter, userId);

            return {
              message: `Game invite re-sent successfully to ${userId}`,
              roomId: roomId,
              senderId: inviter,
              receiverId: userId,
              notifId: id,
              gameId: gameId
            }
          }
        } else {
          const insert = fastify.db.prepare(`
            INSERT INTO game_invites (game_id, user_id, inviter_id, slot)
            VALUES (?, ?, ?, ?)
          `);
          const result = insert.run(gameId, userId, inviter, slot);
          if (result.changes === 0) {
            throw new Error('Failed to send invite');
          }

          const id = await fastify.notifications.gameInvite(inviter, userId, gameId);
          const roomId = await fastify.dbChat.createDirectMessage(inviter, userId);

          return {
            message: `Game invite sent successfully to ${userId}`,
            roomId: roomId,
            senderId: inviter,
            receiverId: userId,
            notifId: id,
            gameId: gameId
          }
        }
      } catch (err) {
        fastify.log.error(err);
        throw new Error('Failed to invite user to game');
      }
    },

    // Cancels a game invite.
    async cancelInvite(gameId, userId, slot) {
      try {
        const check = fastify.db.prepare(`
          SELECT * FROM game_invites WHERE game_id = ? AND inviter_id = ? AND slot = ?
        `).get(gameId, userId, slot);
        if (!check) {
          return { error: 'Invite not found', status: 404 };
        }
        if (check.status !== 'pending') {
          return { error: 'Invite is not pending', status: 409 };
        }

        const recipient = fastify.db.prepare(`
          SELECT * FROM game_invites WHERE game_id = ? AND status = 'pending'
        `).get(gameId)
        if (!recipient) {
          return { error: 'Recipient not found for this invite', status: 404 };
        }

        console.log(`Invite cancelled for game ${gameId}, slot ${slot} by user ${userId}`); //! DELETE
        await fastify.notifications.gameInviteCancelled(userId, recipient.user_id, gameId);

        const deleteQuery = fastify.db.prepare(`
          DELETE FROM game_invites WHERE game_id = ? AND inviter_id = ? AND slot = ? AND status = 'pending'
        `);
        const result = deleteQuery.run(gameId, userId, slot);
        if (result.changes === 0) {
          throw new Error('Failed to cancel invite');
        }
        const notificationRow = fastify.db.prepare(`
          SELECT id FROM notifications WHERE type = 'game.invite' AND type_id = ? AND sender_id = ?
        `).get(gameId, userId);
        if (notificationRow) {
          const deleteNotif = fastify.db.prepare(`
            DELETE FROM notifications WHERE id = ?
          `);
          deleteNotif.run(notificationRow.id);
        }
        const deleteMessagesQuery = fastify.db.prepare(`
          DELETE FROM messages WHERE content LIKE ? AND content LIKE ? AND content LIKE ?
        `);
        deleteMessagesQuery.run('%game.invite%', `%gameId":${gameId}%`, `%slot":"${slot}"%`);

        return { message: 'Invite successfully cancelled.' };
      } catch (err) {
        fastify.log.error(err);
        throw new Error('Failed to cancel invite');
      }
    },
        
    // Responds to a game invite.
    async respondToInvite(gameId, userId, response) {
      try {
        const inviteQuery = fastify.db.prepare(`
          SELECT id, status, inviter_id, slot FROM game_invites
          WHERE game_id = ? AND user_id = ?
        `);
        const invite = inviteQuery.get(gameId, userId);

        if (!invite) {
          return { error: 'Invite not found or it has been cancelled.', status: 404 };
        }

        const gamePlayer = fastify.db.prepare(`
          SELECT player_id FROM game_players WHERE game_id = ? AND player_id = ?
        `).get(gameId, userId);

        if (invite.status !== 'pending' && gamePlayer) {
          return { error: 'You have already responded to this invite.', status: 409 }
        }

        const gameStatus = fastify.db.prepare(`
          SELECT status FROM games WHERE id = ?
        `).get(gameId)
        
        if (gameStatus.status !== 'pending') {
          return { error: 'Game is not joinable', status: 400 }
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
          const response = await fastify.dbGames.joinGame(gameId, userId, invite.slot)
          if (response.error) {
            return { error: response.error, status: response.status }
          }
        }

        if (response === 'decline') {
          return { message: 'Invite declined successfully', slot: invite.slot }
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

        try {
          const axios = require('axios');
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

    // Retrieves a list of pending game invites for a user.
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

    // Simple function to update the main status to in-game
    async updateInGameStatus(userId, gameId, status) {
      try {
        let query
        const checkTournament = fastify.db.prepare(
          'SELECT mode FROM game_settings WHERE game_id = ?'
        ).get(gameId)
        if (checkTournament.mode !== 'tournament') {
          const gameQuery = fastify.db.prepare('SELECT created_by FROM games WHERE id = ?');
          const game = gameQuery.get(gameId);
          if (!game) {
            return { error: 'Game not found', status: 404 };
          }
          if (game.created_by !== Number(userId)) {
            return { error: 'User not authorized to modify this game', status: 403 };
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
            return { error: 'User not authorized', status: 403 }
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

    // Retrieves the tournament ID associated with the game.
    async getTournamentId(gameId) {
      try {
        const query = fastify.db.prepare(`
          SELECT tournament_id FROM tournament_games WHERE game_id = ?
        `)
        const result = query.get(gameId)
        if (!result) {
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
  dependencies: ['tournamentAutoHooks', 'notificationPlugin', 'chatAutoHooks']
})
