'use strict'

const fp = require('fastify-plugin')
const schemas = require('../routes/tournaments/schemas/loader')
const axios = require('axios')

module.exports = fp(async function tournamnentAutoHooks(fastify, opts) {
  // const chatApi = axios.create({
  //   baseURL: `http://chat:${process.env.CHAT_PORT}`,
  //   timeout: 2_000
  // })

  // function bearer (request) {
  //   const authHeader = request.headers['authorization']
  //   const token = authHeader && authHeader.replace(/^Bearer\s+/i, '')
  //   if (!token) {
  //     throw fastify.httpErrors.unauthorized('Missing JWT')
  //   }
  //   return token
  // }

  fastify.register(schemas)

  fastify.decorate('dbTournaments', {
    // Creates a new tournament, its settings and adds the user as the first player
    async createTournament(request, userId, name, maxPlayers, gameMode, gameType) {
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

        const tourSettings = fastify.db.prepare(
          'INSERT INTO tournament_settings (tournament_id, game_mode, game_type, max_players) VALUES (?, ?, ?, ?)'
        )
        const tourSettingsResult = tourSettings.run(tournamentId, gameMode, gameType, maxPlayers)
        if (tourSettingsResult.changes === 0) {
          throw new Error('Failed to create tournament settings')
        }

        const tourPlayersQuery = fastify.db.prepare(
          'INSERT INTO tournament_players (tournament_id, user_id, slot_index) VALUES (?, ?, ?)'
        )
        const tourPlayersResult = tourPlayersQuery.run(tournamentId, userId, 0)
        if (tourPlayersResult.changes === 0) {
          throw new Error('Failed to add user to tournament players')
        }
        fastify.db.exec('COMMIT')       
        
        // const { data: room } = await chatApi.post('/chat/create/group', 
        //   { name: `Tournament ${tournamentId}`, type: 'private', is_game: true },
        //   { headers: { Authorization: `Bearer ${bearer(request)}` } }
        // )

        // fastify.db.prepare(`
        //   UPDATE tournaments SET chat_room_id = ? WHERE id = ?
        // `).run(room.conversationId, tournamentId)

        return tournamentId
      } catch (err) {
        if (fastify.db.inTransaction)
          fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to create tournament')
      }
    },

    // Joins a user to a tournament, either by accepting an invite or an open slot
    async joinTournament(request, tournamentId, userId, slotIndex) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          return { error: 'Tournament not found', status: 404 }
        }
        if (checkTournament.status !== 'pending') {
          return { error: 'Tournament is not joinable', status: 409 }
        }

        const checkSettings = fastify.db.prepare(
          'SELECT * FROM tournament_settings WHERE tournament_id = ?'
        )
        const checkTourSettings = checkSettings.get(tournamentId)
        if (!checkTourSettings) {
          return { error: 'Tournament settings not found', status: 404 }
        }

        const hasAccepted = fastify.db.prepare(
          'SELECT * FROM tournament_invites WHERE tournament_id = ? AND user_id = ? AND status = ?'
        ).get(tournamentId, userId, 'accepted')

        if (checkTourSettings.game_mode === 'private' && !hasAccepted) {
          return { error: 'Tournament is private', status: 403 }
        }

        const totalPlayers = fastify.db.prepare(
          'SELECT COUNT (*) FROM tournament_players WHERE tournament_id = ?'
        )
        const totalPlayersCount = totalPlayers.get(tournamentId)['COUNT (*)']
        if (totalPlayersCount >= checkTourSettings.max_players) {
          return { error: 'Tournament is full', status: 409 }
        }
        const checkPlayer = fastify.db.prepare(
          'SELECT * FROM tournament_players WHERE tournament_id = ? AND user_id = ?'
        )
        const existingPlayer = checkPlayer.get(tournamentId, userId)
        if (existingPlayer) {
          return { error: 'User already joined the tournament', status: 409 }
        }

        const isInvited = fastify.db.prepare(
          'SELECT * FROM tournament_invites WHERE tournament_id = ? AND user_id = ? AND status = ?'
        ).get(tournamentId, userId, 'accepted')
        fastify.db.exec('BEGIN')
        let slot
        if (isInvited) {
          slot = isInvited.slot_index
        } else if (slotIndex === null || slotIndex === undefined) {
          const nextSlotQuery = fastify.db.prepare(
            'SELECT COALESCE(MAX(slot_index), -1) + 1 AS next_slot FROM tournament_players WHERE tournament_id = ?'
          )
          const nextSlotResult = nextSlotQuery.get(tournamentId)
          slot = nextSlotResult.next_slot
          if (slot >= checkTourSettings.max_players) {
            return { error: 'No available slots in the tournament', status: 409 }
          }
        } else {
          slot = slotIndex
        }
        const tourPlayersQuery = fastify.db.prepare(
            'INSERT INTO tournament_players (tournament_id, user_id, slot_index) VALUES (?, ?, ?)'
        )
        const tourPlayersResult = tourPlayersQuery.run(tournamentId, userId, slot)
        if (tourPlayersResult.changes === 0) {
          throw new Error('Failed to add user to tournament players')
        }
        // const tourChat = fastify.db.prepare(
        //   'SELECT chat_room_id FROM tournaments WHERE id = ?'
        // ).get(tournamentId)
        // if (tourChat) {
        //   const res = await chatApi.post('/chat/join/group', 
        //     { groupId: tourChat.chat_room_id },
        //     { headers: { Authorization: `Bearer ${bearer(request)}` }})
        //   if (res.status !== 200) {
        //     throw new Error('Failed to join chat room')
        //   }
        // }  
        fastify.db.exec('COMMIT')
        
        return { message: 'Joined tournament successfully' }
      } catch (err) {
        if (fastify.db.inTransaction)
          fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to join tournament')
      }
    },

    // Invites a user to join a tournament
    async inviteUserToTournament(tournamentId, userId, slotIndex) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          return { error: 'Tournament not found', status: 404 }
        }
        
        const row = fastify.db.prepare(`
          SELECT 1 FROM tournament_players
          WHERE tournament_id = ? AND user_id = ?
        `).get(tournamentId, userId)
        if (row) {
          return { error: 'User already joined the tournament', status: 409 }
        }

        const tournamentStatus = fastify.db.prepare(`
          SELECT status FROM tournaments WHERE id = ?
        `).get(tournamentId)
        if (!tournamentStatus) {
          return { error: 'Tournament not found', status: 404 }
        }
        if (tournamentStatus.status !== 'pending') {
          return { error: 'Tournament is not joinable', status: 409 }
        }

        const result = fastify.db.prepare(`
          INSERT INTO tournament_invites
                (tournament_id, user_id, slot_index, status)
          VALUES (?, ?, ?, 'pending')
          ON CONFLICT(tournament_id, user_id) DO UPDATE
                SET slot_index  = excluded.slot_index,
                    status      = 'pending',
                    updated_at  = CURRENT_TIMESTAMP
        `).run(tournamentId, userId, slotIndex)
        if (result.changes === 0) {
          throw new Error('Failed to invite user to tournament')
        }

        await fastify.notifications.tournamentInvite(checkTournament.created_by, userId, tournamentId)

        return { message: 'User invited to tournament successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to invite user to tournament')
      }
    },

    // Retrieves all tournament invites for a user
    async getTournamentInvites(tournamentId, user) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        const query = fastify.db.prepare(
          'SELECT * FROM tournament_invites WHERE tournament_id = ? AND user_id = ?'
        )
        const invites = query.all(tournamentId, user)

        return invites
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament invites')
      }
    },

    // Responds to a tournament invite, either accepting or declining it
    async respondToTournamentInvite(inviteId, userId, response, tournamentId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournament_invites WHERE id = ? AND user_id = ?'
        )
        const checkInvite = check.get(inviteId, userId)
        if (!checkInvite) {
          return { error: 'Invite not found', status: 404 }
        }
        if (checkInvite.tournament_id !== tournamentId) {
          return { error: 'Invite does not belong to this tournament', status: 403 }
        }

        const updateQuery = fastify.db.prepare(
          'UPDATE tournament_invites SET status = ? WHERE id = ?'
        )
        const result = updateQuery.run(response, inviteId)
        if (result.changes === 0) {
          throw new Error('Failed to update invite response')
        }

        if (response === 'accepted') {
          const joinResult = await fastify.dbTournaments.joinTournament(tournamentId, userId)
          return joinResult
        }

        return { message: 'Invite response updated successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to respond to tournament invite')
      }
    },

    // Leaves a tournament, removing the user from the tournament players
    async leaveTournament(tournamentId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          return { error: 'Tournament not found', status: 404 }
        }
        if (checkTournament.created_by === Number(userId)) {
          return { error: 'Creator cannot leave the tournament', status: 403 }
        }

        const query = fastify.db.prepare(
          'DELETE FROM tournament_players WHERE tournament_id = ? AND user_id = ?'
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

    // Retrieves all tournaments with their players and settings
    async getTournaments() {
      try {
        const rows = fastify.db.prepare(`
          SELECT
            tournaments.id,
            tournaments.name,
            tournaments.status,
            tournaments.created AS createdRaw,
            tournaments.ended AS endedRaw,
            users.id AS creatorById,
            users.username AS creatorUsername,
            tournament_settings.game_mode AS gameMode,
            tournament_settings.max_players AS maxPlayers
          FROM tournaments
          JOIN users ON users.id = tournaments.created_by
          JOIN tournament_settings ON tournament_settings.tournament_id = tournaments.id
          ORDER BY tournaments.created DESC
        `).all()
        if (!rows || rows.length === 0) {
          return []
        }

        const playerRows = fastify.db.prepare(`
          SELECT
            tournament_players.tournament_id AS tournamentId,
            users.id AS playerId,
            users.username AS playerUsername
          FROM tournament_players
          JOIN users ON users.id = tournament_players.user_id
        `).all()

        const baseURL =  "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT
        const players = playerRows.reduce((acc, row) => {
          (acc[row.tournamentId] ||= []).push({
            id: row.playerId,
            username: row.playerUsername,
            avatarUrl: `${baseURL}/users/${row.playerId}/avatar`
          })
          return acc
        }, {})
        
        return rows.map(tournament => ({
          id: tournament.id,
          name: tournament.name,
          status: tournament.status,
          created: new Date(tournament.createdRaw).toISOString(),
          ended: tournament.endedRaw ? new Date(tournament.endedRaw).toISOString() : null,
          created_by: {
            id: tournament.creatorById,
            username: tournament.creatorUsername,
            avatarUrl: `${baseURL}/users/${tournament.creatorById}/avatar`
          },
          settings: {
            gameMode: tournament.gameMode,
            maxPlayers: tournament.maxPlayers
          },
          players: players[tournament.id] || []
        }))
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournaments')
      }
    },

    // Retrieve general tournament information
    async getTournamentById(tournamentId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const tournament = query.get(tournamentId)
        if (!tournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        return tournament
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament')
      }
    },

    // Retrieve tournament settings
    async getTournamentSettings(tournamentId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM tournament_settings WHERE tournament_id = ?'
        )
        const settings = query.get(tournamentId)
        if (!settings) {
          return { error: 'Tournament settings not found', status: 404 }
        }

        return settings
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament settings')
      }
    },

    // Retrieve all players in a tournament
    async getTournamentPlayers(tournamentId) {
      try {
        const accepted = fastify.db.prepare(
          `SELECT 
            tournament_players.user_id AS id,
            users.username,
            tournament_aliases.alias AS alias,
            tournament_players.slot_index AS slotIndex,
            'accepted' AS status
          FROM tournament_players
          JOIN users ON users.id = tournament_players.user_id
          LEFT JOIN tournament_aliases ON tournament_aliases.tournament_id = tournament_players.tournament_id
          AND tournament_aliases.user_id = tournament_players.user_id
          WHERE tournament_players.tournament_id = ?
        `).all(tournamentId)
        const pending = fastify.db.prepare(`
        SELECT user_id AS id,
              username,
              NULL AS alias,
              slot_index AS slotIndex,
              'pending' AS status
          FROM tournament_invites
          JOIN users ON users.id = user_id
          WHERE tournament_id = ?
            AND status = 'pending'
        `).all(tournamentId)

        if (!accepted || accepted.length === 0) {
          return []
        }
        const baseURL =  "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT
        return [...accepted, ...pending].map(p => ({
          ...p,
          avatarUrl: `${baseURL}/users/${p.id}/avatar`
        }))
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament players')
      }
    },

    // Deletes a tournament if it is in pending status and created by the user
    async deleteTournament(tournamentId, userId) {
      try {
        const tourQuery = fastify.db.prepare('SELECT created_by, status FROM tournaments WHERE id = ?')
        const tournament = tourQuery.get(tournamentId)
        if (!tournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        if (tournament.created_by !== Number(userId)) {
          return { error: 'User not authorized to delete this tournament', status: 403 }
        }
        if (tournament.status !== 'pending') {
          throw new Error('Tournament is not in pending status')
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

    // Starts a tournament by seeding the bracket and updating its status to active
    async startTournament(tournamentId, userId) {
      try{        
        const tourQuery = fastify.db.prepare('SELECT created_by FROM tournaments WHERE id = ?')
        const tournament = tourQuery.get(tournamentId)
        if (!tournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        if (tournament.created_by !== Number(userId)) {
          return { error: 'User not authorized to delete this tournament', status: 403 }
        }
        if (tournament.status !== 'pending') {
          throw new Error('Tournament is not in pending status')
        }
        await fastify.dbTournaments.seedBracket(tournamentId)
        fastify.db.exec('BEGIN')
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
        fastify.db.exec('COMMIT')
        return { success: true, message: 'Tournament started successfully' }
      } catch (err) {
        if (fastify.db.inTransaction)
          fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to start tournament')
      }
    },

    // Pairs off players randomly for the tournament bracket
    async pairOffPlayers (players) {
      try {
        const shuffledPlayers = players.sort(() => Math.random() - 0.5)
        const pairs = []
        for (let i = 0; i < shuffledPlayers.length; i += 2) {
          if (i + 1 < shuffledPlayers.length) {
            pairs.push([shuffledPlayers[i], shuffledPlayers[i + 1]])
          } else {
            pairs.push([shuffledPlayers[i], null])
          }
        }

        return pairs
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to pair off players')
      }
    },

    // Seeds the tournament bracket by creating matches and games for each pair of players
    async seedBracket(tournamentId) {
      try {
        const players = fastify.db.prepare(
          'SELECT user_id FROM tournament_players WHERE tournament_id = ?'
        ).all(tournamentId).map(p => p.user_id)

        if (players.length < 2) {
          return { success: false, message: 'Not enough players to seed bracket' }
        }

        if (players.length !== 4 && players.length !== 8 && players.length !== 16) {
          throw new Error('Invalid number of tournament players, cannot seed bracket')
        }

        const tourConfig = fastify.db.prepare(
          'SELECT * FROM tournament_settings WHERE tournament_id = ?'
        ).get(tournamentId)
        if (!tourConfig) {
          return { success: false, message: 'Tournament settings not found' }
        }


        const pairs = await fastify.dbTournaments.pairOffPlayers(players)

        const insertMatch = fastify.db.prepare(`
          INSERT INTO tournament_games (tournament_id, game_id, round, slot) VALUES (?, ?, ?, ?)
        `)

        let slot = 0
        for (const [player1, player2] of pairs) {
          const gameId = await fastify.dbGames.createGame(
            player1, 'tournament', 2, 'local', tourConfig.game_mode
          )
          if (!gameId) {
            throw new Error('Failed to create game for tournament match')
          }
          fastify.db.exec('BEGIN')
          fastify.db.prepare(
            'INSERT INTO game_players (game_id, player_id) VALUES (?, ?)'
          ).run(gameId, player2)
          fastify.db.prepare(
            'UPDATE game_settings SET num_games = ?, num_matches = ?, ball_speed = ?, death_timed = ?, time_limit_s = ? WHERE game_id = ?'
          ).run(tourConfig.num_games, tourConfig.num_matches, tourConfig.ball_speed, tourConfig.death_timed, tourConfig.time_limit_s, gameId)
      
          insertMatch.run(tournamentId, gameId, 1, slot)
          fastify.db.exec('COMMIT')
          
          await fastify.notifications.gameTurn(player1, gameId)
          await fastify.notifications.gameTurn(player2, gameId)
  
          slot++
        }

        return { success: true, message: 'Tournament bracket seeded successfully' }
      } catch (err) {
        if (fastify.db.inTransaction)
          fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to seed tournament bracket')
      }
    },

    // Updates the tournament options if the user is the creator and the tournament is in pending status
    async updateTournamentOptions(tournamentId, userId, num_games, num_matches, ball_speed, death_timed, time_limit) {
      try {
        let transactionHere = false
        if (!fastify.db.inTransaction) {
          fastify.db.exec('BEGIN')
          transactionHere = true
        }
        const tourQuery = fastify.db.prepare('SELECT * FROM tournaments WHERE id = ?')
        const tournament = tourQuery.get(tournamentId)
        if (!tournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        if (tournament.created_by !== Number(userId)) {
          return { error: 'User not authorized to delete this tournament', status: 403 }
        }
        if (tournament.status !== 'pending') {
          return { error: 'Tournament is not in pending status', status: 403 }
        }

        const deathTimedInt = death_timed ? 1 : 0 
        const updateQuery = fastify.db.prepare(
          `UPDATE tournament_settings SET num_games = ?, num_matches = ?, ball_speed = ?, death_timed = ?, time_limit_s = ? WHERE tournament_id = ?`,
        )
        const updateResult = updateQuery.run(num_games, num_matches, ball_speed, deathTimedInt, time_limit, tournamentId)
        if (updateResult.changes === 0) {
          throw new Error('Failed to update game options')
        }
        if (transactionHere) {
          fastify.db.exec('COMMIT')
        }

        return { message: 'Tournament options updated successfully' }
      } catch (err) {
        fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to update tournament options')
      }
    },

    // Creates a tournament alias for a user in a specific tournament
    async createTournamentAlias(tournamentId, userId, alias) {
      try {
        fastify.db.exec('BEGIN')
        const check = fastify.db.prepare(
          'SELECT * FROM tournament_players WHERE tournament_id = ? AND user_id = ?'
        )
        const checkPlayer = check.get(tournamentId, userId)
        if (!checkPlayer) {
          return { error: 'User not found in tournament', status: 404 }
        }
        const insertAlias = fastify.db.prepare(
          'INSERT INTO tournament_aliases (tournament_id, user_id, alias) VALUES (?, ?, ?)'
        )
        const result = insertAlias.run(tournamentId, userId, alias)
        if (result.changes === 0) {
          throw new Error('Failed to create tournament alias')
        }
        fastify.db.exec('COMMIT')
        return { message: 'Tournament alias created successfully' }
      } catch (err) {
        fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to create tournament alias')
      }
    },

    // Deletes a tournament alias for a user in a specific tournament
    async deleteTournamentAlias(tournamentId, userId, alias) {
      try {
        fastify.db.exec('BEGIN')
        const check = fastify.db.prepare(
          'SELECT * FROM tournament_aliases WHERE tournament_id = ? AND user_id = ? AND alias = ?'
        )
        const checkAlias = check.get(tournamentId, userId, alias)
        if (!checkAlias) {
          return { error: 'Tournament alias not found or user not authorized', status: 404 }
        }
        const deleteAlias = fastify.db.prepare(
          'DELETE FROM tournament_aliases WHERE tournament_id = ? AND user_id = ? AND alias = ?'
        )
        const result = deleteAlias.run(tournamentId, userId, alias)
        if (result.changes === 0) {
          throw new Error('Failed to delete tournament alias')
        }
        fastify.db.exec('COMMIT')
        
        return { message: 'Tournament alias deleted successfully' }
      } catch (err) {
        fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to delete tournament alias')
      }
    },

    // Retrieves all aliases for a user in a specific tournament
    async getTournamentAliases(tournamentId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM tournament_aliases WHERE tournament_id = ?'
        )
        const aliases = query.all(tournamentId)
        if (aliases.length === 0) {
          return []
        }

        return aliases
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament aliases')
      }
    },

    // Retrieves the tournament brackets 
    async getTournamentBrackets(tournamentId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        const query = fastify.db.prepare(`
          SELECT 
            tournament_games.id AS tournamentGameId,
            tournament_games.tournament_id AS tournamentId,
            tournament_games.round,
            tournament_games.slot,
            tournament_games.status,
            tournament_games.winner_id,
            games.id AS gameId,
            game_players.player_id AS playerId,
            tournament_aliases.alias AS playerAlias,
            (
              SELECT COUNT(*) 
              FROM game_matches 
              WHERE game_matches.game_id = tournament_games.game_id AND game_matches.winner_id = game_players.player_id
            ) AS matchesWon
          FROM tournament_games
          JOIN games ON games.id = tournament_games.game_id
          JOIN game_players ON game_players.game_id = tournament_games.game_id
          LEFT JOIN tournament_aliases ON tournament_aliases.tournament_id = tournament_games.tournament_id
          AND tournament_aliases.user_id = game_players.player_id
          WHERE tournament_games.tournament_id = ?
          ORDER BY tournament_games.round, tournament_games.slot
        `)
        const rows = query.all(tournamentId)
        if (rows.length === 0) {
          throw new Error('Failed to retrieve tournament brackets')
        }
        const brackets = []
        for (const row of rows) {
          let round = brackets.find(r => r.round === row.round)
          if (!round) {
            round = { round: row.round, slots: [] }
            brackets.push(round)
          }

          let slot = round.slots.find(s => s.slot === row.slot)
          if (!slot) {
            slot = {
              slot: row.slot,
              tournamentGameId: row.tournamentGameId,
              status: row.status,
              winnerId: row.winner_id,
              gameId: row.gameId,
              players: [],
              score: {}
            }
            round.slots.push(slot)
          }

          if (!slot.players.some(p => p.playerId === row.playerId)) {
            slot.players.push({
              playerId: row.playerId,
              playerAlias: row.playerAlias ?? null
            })
          }
          slot.score[row.playerId] = row.matchesWon
        }

        return { tournamentId, brackets }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament brackets')
      }
    },


    // Retrieves all games in the latest round of a tournament for a specific user
    async getTournamentGames(tournamentId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        const checkRound = fastify.db.prepare(`
          SELECT MAX(round) AS max_round FROM tournament_games WHERE tournament_id = ?
        `).get(tournamentId)
        if (!checkRound || checkRound.max_round === null) {
          return []
        }

        const checkPlayerInRound = fastify.db.prepare(`
          SELECT 1 FROM tournament_games
          JOIN game_players ON game_players.game_id = tournament_games.game_id
          WHERE tournament_games.tournament_id = ? AND game_players.player_id = ? AND tournament_games.round = ?
        `)
        const playerInRound = checkPlayerInRound.get(tournamentId, userId, checkRound.max_round)
        if (!playerInRound) {
          throw new Error('User not found in the latest round of the tournament')
        }
        const query = fastify.db.prepare(`
          SELECT 
            tournament_games.id AS tournamentGameId,
            tournament_games.tournament_id AS tournamentId,
            tournament_games.round,
            tournament_games.slot,
            tournament_games.status,
            tournament_games.winner_id,
            games.id AS gameId,
            game_players.player_id AS playerId,
            tournament_aliases.alias AS playerAlias
          FROM tournament_games
          JOIN games ON games.id = tournament_games.game_id
          JOIN game_players ON game_players.game_id = tournament_games.game_id
          LEFT JOIN tournament_aliases ON tournament_aliases.tournament_id = tournament_games.tournament_id
          AND tournament_aliases.user_id = game_players.player_id
          WHERE tournament_games.tournament_id = ? AND game_players.player_id = ? AND tournament_games.round = ?
          ORDER BY tournament_games.round, tournament_games.slot
        `)
        const games = query.all(tournamentId, userId, checkRound.max_round)
        if (games.length === 0) {
          return [] 
        }
        return games.map(g => ({
          tournamentGameId: g.tournamentGameId,
          tournamentId: g.tournamentId,
          round: g.round,
          slot: g.slot,
          status: g.status,
          gameId: g.gameId,
          players: games.map(p => ({
            playerId: p.player_id,
            playerAlias: p.playerAlias || null
          })),
        }))
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament games')
      }
    },

    // Handles if a tournament game is finished
    async onGameFinished(gameId) {
      let transactionActive = false
      try {
        const row = fastify.db.prepare(`
          SELECT tournament_id, round FROM tournament_games WHERE game_id = ?
        `).get(gameId)
        if (!row) {
          return { error: 'Game not found in tournament_games', status: 404 }
        }
        const { tournament_id: tournamentId, round } = row  

        fastify.db.exec('BEGIN')
        transactionActive = true
        
        const gameResult = fastify.db.prepare(`
          SELECT winner_id FROM games WHERE id = ?
        `).get(gameId)
        if (!gameResult) {
          return { error: 'Game not found', status: 404 }
        }
        const winnerId = gameResult.winner_id
        
        const updateTourGame = fastify.db.prepare(`
          UPDATE tournament_games
          SET status = 'finished', winner_id = ?
          WHERE game_id = ?
        `)
        const updateResult = updateTourGame.run(winnerId, gameId)
        if (updateResult.changes === 0) {
          throw new Error(`Failed to update tournament_games for gameId: ${gameId}`)
        }

        const pendingGames = fastify.db.prepare(`
          SELECT 1 FROM tournament_games
          WHERE tournament_id = ? AND round = ? AND status = 'pending'
        `).get(tournamentId, round)
        fastify.db.exec('COMMIT')
        transactionActive = false
        
        if (!pendingGames) {
          try {
            await fastify.dbTournaments.nextRound(tournamentId, round)
          } catch (nextRoundError) {
            fastify.log.error('Failed to advance to next round:', {
              tournamentId,
              round,
              error: nextRoundError.message,
              stack: nextRoundError.stack
            })
          }
        }
        
      } catch (err) {
        if (transactionActive) {
          try {
            fastify.db.exec('ROLLBACK')
            fastify.log.warn(`Rolled back tournament game update for gameId: ${gameId}`)
          } catch (rollbackErr) {
            fastify.log.error('Rollback failed:', rollbackErr.message)
          }
        }
        
        fastify.log.error(`Tournament processing failed for gameId ${gameId}:`, err)
        throw err
      }
    },

    // Advances to the next round of the tournament
    async nextRound(tournamentId, prevRound) {
      const winners = fastify.db.prepare(`
        SELECT 
          tournament_games.winner_id, 
          slot, 
          users.username
        FROM tournament_games
        JOIN users ON users.id = tournament_games.winner_id
        WHERE tournament_id = ? AND round = ? AND status = 'finished'
        ORDER BY slot ASC
      `).all(tournamentId, prevRound)

      if (winners.length === 0) {
        return []
      }

      if (winners.length === 1) {
        fastify.db.prepare(`
          UPDATE tournaments
            SET status = 'finished', winner_id = ?, ended = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(winners[0].winner_id, tournamentId)

        const tournamentName = fastify.db.prepare(`
          SELECT name FROM tournaments WHERE id = ?
        `).get(tournamentId)
        if (!tournamentName) {
          return { error: 'Tournament not found', status: 404 }
        }

        await fastify.notifications.tournamentUpdate(tournamentId, `Tournament ${tournamentName} has finished! Winner: ${winners[0].username}`, 'finished')

        return { message: 'Tournament finished', winnerId: winners[0].winner_id }
      }

      const nextRound = prevRound + 1
      const tourConfig = fastify.db.prepare(
        'SELECT * FROM tournament_settings WHERE tournament_id = ?'
      ).get(tournamentId)
      if (!tourConfig) {
        return { error: 'Tournament settings not found', status: 404 }
      }
      const insertMatch = fastify.db.prepare(`
        INSERT INTO tournament_games (tournament_id, game_id, round, slot) VALUES (?, ?, ?, ?)
      `)
      for (let i = 0; i < winners.length; i += 2) {
        const player1 = winners[i].winner_id
        const player2 = winners[i + 1].winner_id
        const slot = Math.floor(winners[i].slot / 2)

        const gameId = await fastify.dbGames.createGame(
          player1, 'tournament', 2, 'local', tourConfig.game_mode
        )
        if (!gameId) {
          return { error: 'Failed to create game for next round', status: 500 }
        }
        fastify.db.prepare(
          'INSERT INTO game_players (game_id, player_id) VALUES (?, ?)'
        ).run(gameId, player2)
        insertMatch.run(tournamentId, gameId, nextRound, slot)
        
        await fastify.notifications.gameTurn(player1, gameId)
        await fastify.notifications.gameTurn(player2, gameId)
      }
    },

    // Retrieves the summary of a tournament including games and players
    async getTournamentSummary(tournamentId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        const tourQuery = fastify.db.prepare(`
          SELECT
            id, 
            name,
            status,
            created,
            started,
            ended,
            winner_id
          FROM tournaments
          WHERE id = ?
        `)
        const tournament = tourQuery.get(tournamentId)
        if (!tournament) {
          return { error: 'Tournament not found', status: 404 }
        }
        const rows = fastify.db.prepare(`
          SELECT
            tournament_games.id AS tournamentGameId,
            tournament_games.round,
            tournament_games.slot,
            tournament_games.status  AS gameStatus,
            tournament_games.winner_id  AS gameWinnerId,
            tournament_games.game_id  AS gameId,
            game_players.player_id AS playerId,
            tournament_aliases.alias AS playerAlias
          FROM tournament_games
          JOIN game_players ON game_players.game_id = tournament_games.game_id
          LEFT JOIN tournament_aliases
            ON  tournament_aliases.tournament_id = tournament_games.tournament_id
            AND tournament_aliases.user_id       = game_players.player_id
          WHERE tournament_games.tournament_id = ?
          ORDER BY tournament_games.round DESC, tournament_games.slot ASC
        `).all(tournamentId)
        if (!rows || rows.length === 0) {
          return { error: 'No games found for this tournament', status: 404 }
        }
        const summary = {
          tournamentId: tournament.id,
          name: tournament.name,
          status: tournament.status,
          created: tournament.created,
          started: tournament.started,
          ended: tournament.ended,
          winnerId: tournament.winner_id || null,
          totalRounds: Math.max(...rows.map(r => r.round)),
          totalGames: new Set(rows.map(r => r.gameId)).size,
          games: []
        }
        for (const row of rows) {
          let game = summary.games.find(g => g.tournamentGameId === row.tournamentGameId)
          if (!game) {
            game = {
              tournamentGameId: row.tournamentGameId,
              round: row.round,
              slot: row.slot,
              status: row.gameStatus,
              winnerId: row.gameWinnerId,
              gameId: row.gameId,
              players: []
            }
            summary.games.push(game)
          }
          if (!game.players.some(p => p.playerId === row.playerId)) {
            game.players.push({
              playerId: row.playerId,
              playerAlias: row.playerAlias || null
            })
          }
        }
        
        return summary
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament summary')  
      }
    },

    // Retrieves all players available to join a tournament
    async getAvailablePlayers(tournamentId) {
      try {
        const allUsers = fastify.db.prepare(
          'SELECT id, username FROM users WHERE id NOT IN (SELECT user_id FROM tournament_players WHERE tournament_id = ?)'
        )
        const availablePlayers = allUsers.all(tournamentId).map(u => ({
          id: u.id,
          username: u.username,
          alias: null,
          avatarUrl: `https://${process.env.SERVER_NAME}:${process.env.SERVER_PORT}/users/${u.id}/avatar`
        }))
        return availablePlayers
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve available players')
      }
    },

    // Retrieves the chat room ID for a specific tournament
    async getTournamentChat(tournamentId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          return { error: 'Tournament not found', status: 404 }
        }
        const checkPlayer = fastify.db.prepare(
          'SELECT * FROM tournament_players WHERE tournament_id = ?'
        ).get(tournamentId)
        if (!checkPlayer) {
          return { error: 'Player not authorized to access this tournament chat', status: 403 }
        }
        const chatRoom = fastify.db.prepare(
          'SELECT chat_room_id FROM tournaments WHERE id = ?'
        ).get(tournamentId)
        if (!chatRoom || !chatRoom.chat_room_id) {
          return { error: 'Chat room not found for this tournament', status: 404 }
        }
        
        return { chatRoomId: chatRoom.chat_room_id }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament chat')
      }
    },

    // Creates a tournament AI 
    async createTournamentAI(tournamentId, userId, slotIndex) {
      try {
        fastify.db.exec('BEGIN')
        const tourQuery = fastify.db.prepare('SELECT created_by FROM tournaments WHERE id = ?')
        const tournament = tourQuery.get(tournamentId)
        if (!tournament) {
          return { error: 'Tournament not found', status: 404 }
        }

        if (tournament.created_by !== Number(userId)) {
          return { error: 'User not authorized to delete this tournament', status: 403 }
        }
        if (tournament.status !== 'pending') {
          throw new Error('Tournament is not in pending status')
        }
        const tourPlayersQuery = fastify.db.prepare(
          'INSERT INTO tournament_players (tournament_id, user_id, slot_index) VALUES (?, ?, ?)'
        )
        const tourPlayersResult = tourPlayersQuery.run(tournamentId, fastify.aiUserId, slotIndex)
        if (tourPlayersResult.changes === 0) {
          throw new Error('Failed to add user to tournament players')
        }
        fastify.db.exec('COMMIT')
        return { message: 'Tournament AI configuration created successfully' }
      } catch (err) {
        fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to create tournament AI configuration')
      }
    }
  })
}, {
  name: 'tournamentAutoHooks',
  dependencies: ['notificationPlugin']
})
