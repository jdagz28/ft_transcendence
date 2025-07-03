'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function tournamnentAutoHooks(fastify, opts) {
  const chatApi = axios.create({
    baseURL: `http://chat:${process.env.CHAT_PORT}`,
    timeout: 2_000
  });

  function bearer (request) {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw fastify.httpErrors.unauthorized('Missing JWT')
    }
    return token;
  }

  fastify.register(schemas)

  fastify.decorate('dbTournaments', {
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
          'INSERT INTO tournament_players (tournament_id, user_id, slot_index) VALUES (?, ?, ?)'
        )
        const tourPlayersResult = tourPlayersQuery.run(tournamentId, userId, 0)
        if (tourPlayersResult.changes === 0) {
          throw new Error('Failed to add user to tournament players')
        }
        console.log('Tournament Players created with ID:', tourPlayersResult.lastInsertRowid) //! DELETE
        fastify.db.exec('COMMIT')       
        
        const { data: room } = await chatApi.post('/chat/create/group', 
          { name: `Tournament ${tournamentId}`, type: 'private' },
          { headers: { Authorization: `Bearer ${bearer(request)}` } }
        )

        console.log('Chat room created with ID:', room.conversationId) //! DELETE
        fastify.db.prepare(`
          UPDATE tournaments SET chat_room_id = ? WHERE id = ?
        `).run(room.conversationId, tournamentId)

        return tournamentId
      } catch (err) {
        fastify.log.error(err)
        fastify.db.exec('ROLLBACK')
        throw new Error('Failed to create tournament')
      }
    },

    async joinTournament(request, tournamentId, userId) {
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

        if (checkTourSettings.game_mode === 'private' && tournament.created_by !== userId) {
          return { error: 'Tournament is private'}
        }

        const totalPlayers = fastify.db.prepare(
          'SELECT COUNT (*) FROM tournament_players WHERE tournament_id = ?'
        )
        const totalPlayersCount = totalPlayers.get(tournamentId)['COUNT (*)']
        if (totalPlayersCount >= checkTourSettings.max_players) {
          return { error: 'Tournament is full' }
        }
        const checkPlayer = fastify.db.prepare(
          'SELECT * FROM tournament_players WHERE tournament_id = ? AND user_id = ?'
        )
        const existingPlayer = checkPlayer.get(tournamentId, userId)
        if (existingPlayer) {
          return { error: 'User already joined the tournament' }
        }

        const isInvited = fastify.db.prepare(
          'SELECT * FROM tournament_invites WHERE tournament_id = ? AND user_id = ? AND status = ?'
        ).get(tournamentId, userId, 'accepted')
        let tourPlayersQuery
        let slotIndex
        fastify.db.exec('BEGIN')
        if (isInvited) {
          slotIndex = isInvited.slot_index
          tourPlayersQuery = fastify.db.prepare(
            'INSERT INTO tournament_players (tournament_id, user_id, slot_index) VALUES (?, ?, ?)'
          )
        } else {
          slotIndex = fastify.db.prepare(
            'SELECT MAX(slot_index) AS last_slot FROM tournament_players WHERE tournament_id = ?'
          ).get(tournamentId).last_slot || 0
          tourPlayersQuery = fastify.db.prepare(
            'INSERT INTO tournament_players (tournament_id, user_id, slot_index) VALUES (?, ?, ?)'
          )
          slotIndex += 1
        }
        const tourPlayersResult = tourPlayersQuery.run(tournamentId, userId, slotIndex)
        if (tourPlayersResult.changes === 0) {
          throw new Error('Failed to add user to tournament players')
        }
        const tourChat = fastify.db.prepare(
          'SELECT chat_room_id FROM tournaments WHERE id = ?'
        ).get(tournamentId)
        console.log('Tournament Id', tournamentId, 'joined by user', userId) //! DELETE
        if (tourChat) {
          console.log('Joining chat room with ID:', tourChat.chat_room_id) //! DELETE
          const res = await chatApi.post('/chat/join/group', 
            { groupId: tourChat.chat_room_id },
            { headers: { Authorization: `Bearer ${bearer(request)}` }})
          if (res.status !== 200) {
            throw new Error('Failed to join chat room')
          }
        }  
        fastify.db.exec('COMMIT')
        console.log('Joined chat room successfully') //! DELETE
        return { message: 'Joined tournament successfully' }
      } catch (err) {
        if (fastify.db.inTransaction)
          fastify.db.exec('ROLLBACK')
        fastify.log.error(err)
        throw new Error('Failed to join tournament')
      }
    },

    async inviteUserToTournament(tournamentId, userId, slotIndex) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          throw new Error('Tournament not found')
        }
        
        const row = fastify.db.prepare(`
          SELECT 1 FROM tournament_players
          WHERE tournament_id = ? AND user_id = ?
        `).get(tournamentId, userId);
        if (row) throw new Error('User already in tournament');

        const result = fastify.db.prepare(`
          INSERT INTO tournament_invites
                (tournament_id, user_id, slot_index, status)
          VALUES (?, ?, ?, 'pending')
          ON CONFLICT(tournament_id, user_id) DO UPDATE
                SET slot_index  = excluded.slot_index,
                    status      = 'pending',
                    updated_at  = CURRENT_TIMESTAMP
        `).run(tournamentId, userId, slotIndex);
        if (result.changes === 0) {
          throw new Error('Failed to invite user to tournament')
        }

        return { message: 'User invited to tournament successfully' }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to invite user to tournament')
      }
    },

    async getTournamentInvites(tournamentId, user) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          throw new Error('Tournament not found')
        }

        const query = fastify.db.prepare(
          'SELECT * FROM tournament_invites WHERE tournament_id = ? AND user_id = ?'
        )
        const invites = query.all(tournamentId, user)
        if (!invites || invites.length === 0) {
          return { message: 'No invites found for this tournament' }
        }
        return invites
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament invites')
      }
    },

    async respondToTournamentInvite(inviteId, userId, response, tournamentId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournament_invites WHERE id = ? AND user_id = ?'
        )
        const checkInvite = check.get(inviteId, userId)
        if (!checkInvite) {
          throw new Error('Invite not found or user not authorized')
        }
        if (checkInvite.tournament_id !== tournamentId) {
          throw new Error('Invite does not belong to this tournament')
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

    async getTournamentSettings(tournamentId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM tournament_settings WHERE tournament_id = ?'
        )
        const settings = query.get(tournamentId)
        if (!settings) {
          throw new Error('Tournament settings not found')
        }
        return settings
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament settings')
      }
    },

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
        `).all(tournamentId);

        if (!accepted || accepted.length === 0) {
          throw new Error('No players found for this tournament')
        }
        const baseURL =  "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT
        return [...accepted, ...pending].map(p => ({
          ...p,
          avatarUrl: `${baseURL}/users/${p.id}/avatar`
        }));
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

    async startTournament(tournamentId, userId) {
      try{        
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
        await fastify.dbTournaments.seedBracket(tournamentId);
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

    async seedBracket(tournamentId) {
      try {
        fastify.db.exec('BEGIN')
        const players = fastify.db.prepare(
          'SELECT user_id FROM tournament_players WHERE tournament_id = ?'
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


        const pairs = await fastify.dbTournaments.pairOffPlayers(players)

        const insertMatch = fastify.db.prepare(`
          INSERT INTO tournament_games (tournament_id, game_id, round, slot) VALUES (?, ?, 1, ?)
        `)

        fastify.db.exec('COMMIT')
        let slot = 0
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
      
          insertMatch.run(tournamentId, gameId, slot)
          await fastify.publishEvent(`tournament.game.ready.${player1}`, {
            gameId,
            tournamentId,
            opponentId: player2,
            round: 1,
            timestamp: Date.now()
          })
          await fastify.publishEvent(`tournament.game.ready.${player2}`, {
            gameId,
            tournamentId,
            opponentId: player1,
            round: 1,
            timestamp: Date.now()
          })
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
    },

    async createTournamentAlias(tournamentId, userId, alias) {
      try {
        fastify.db.exec('BEGIN')
        const check = fastify.db.prepare(
          'SELECT * FROM tournament_players WHERE tournament_id = ? AND user_id = ?'
        )
        const checkPlayer = check.get(tournamentId, userId)
        if (!checkPlayer) {
          throw new Error('User not authorized to create alias for this tournament')
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

    async deleteTournamentAlias(tournamentId, userId, alias) {
      try {
        fastify.db.exec('BEGIN')
        const check = fastify.db.prepare(
          'SELECT * FROM tournament_aliases WHERE tournament_id = ? AND user_id = ? AND alias = ?'
        )
        const checkAlias = check.get(tournamentId, userId, alias)
        if (!checkAlias) {
          throw new Error('Tournament alias not found or user not authorized')
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

    async getTournamentAliases(tournamentId) {
      try {
        const query = fastify.db.prepare(
          'SELECT * FROM tournament_aliases WHERE tournament_id = ?'
        )
        const aliases = query.all(tournamentId)
        if (!aliases) {
          throw new Error('Failed to retrieve tournament aliases')
        }
        return aliases
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament aliases')
      }
    },

    async getTournamentBrackets(tournamentId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          throw new Error('Tournament not found')
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
          WHERE tournament_games.tournament_id = ?
          ORDER BY tournament_games.round, tournament_games.slot
        `)
        const rows = query.all(tournamentId)
        if (rows.length === 0) {
          throw new Error('Failed to retrieve tournament brackets')
        }
        const brackets = [];
        for (const row of rows) {
          let round = brackets.find(r => r.round === row.round);
          if (!round) {
            round = { round: row.round, slots: [] };
            brackets.push(round);
          }

          let slot = round.slots.find(s => s.slot === row.slot);
          if (!slot) {
            slot = {
              slot: row.slot,
              tournamentGameId: row.tournamentGameId,
              status: row.status,
              winnerId: row.winner_id,
              gameId: row.gameId,
              players: []
            };
            round.slots.push(slot);
          }

          if (!slot.players.some(p => p.playerId === row.playerId)) {
            slot.players.push({
              playerId: row.playerId,
              playerAlias: row.playerAlias ?? null
            });
          }
        }

        return { tournamentId, brackets }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament brackets')
      }
    },

    async getTournamentGames(tournamentId, userId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          throw new Error('Tournament not found')
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
        if (!games) {
          throw new Error('Failed to retrieve tournament games')
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

    async onGameFinished(gameId) {
      const row = fastify.db.prepare(`
        SELECT tournament_id, round FROM tournament_games WHERE game_id = ?
      `).get(gameId)
      if (!row)
        return

      const { tournament_id: tournamentId, round } = row
      fastify.db.exec('BEGIN')
      const winnerId = fastify.db.prepare(`
        SELECT winner_id FROM games WHERE id = ?
      `).get(gameId).winner_id
      const updateTourGame = fastify.db.prepare(`
          UPDATE tournament_games
          SET status = 'finished', winner_id = ?
        WHERE game_id = ?
      `)
      updateTourGame.run(winnerId, gameId)
    
      const pendingGames = fastify.db.prepare(`
        SELECT 1 FROM tournament_games
        WHERE tournament_id = ? AND round = ? AND status = 'pending'
      `).get(tournamentId, round)
      if (!pendingGames) {
        await fastify.dbTournaments.nextRound(tournamentId, round)
      }
      fastify.db.exec('COMMIT')
    },

    async nextRound(tournamentId, prevRound) {
      const winners = fastify.db.prepare(`
        SELECT winner_id FROM tournament_games
        WHERE tournament_id = ? AND round = ? AND status = 'finished'
      `).all(tournamentId, prevRound)
      if (winners.length === 1) {
        fastify.db.prepare(`
          UPDATE tournaments
            SET status = 'finished', winner_id = ?, ended = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(winners[0], tournamentId)

        await fastify.publishEvent(`tournament.finished.${winners[0]}`, {
          tournamentId,
          winnerId: winners[0],
          timestamp: Date.now()
        })

        return { message: 'Tournament finished', winnerId: winners[0] }
      }

      const nextRound = prevRound + 1
      const tourConfig = fastify.db.prepare(
        'SELECT * FROM tournament_settings WHERE tournament_id = ?'
      ).get(tournamentId)
      if (!tourConfig) {
        throw new Error('Tournament settings not found')
      }
      const insertMatch = fastify.db.prepare(`
        INSERT INTO tournament_games (tournament_id, game_id, round, slot) VALUES (?, ?, ?, ?)
      `)
      for (let i = 0; i < winners.length; i += 2) {
        const player1 = winners[i].winner_id
        const player2 = winners[i + 1].winner_id
        const slot = Math.floor(winners[i].slot / 2);

        const gameId = await fastify.dbGames.createGame(
          player1, 'tournament', 2, 'local', tourConfig.game_mode
        )
        if (!gameId) {
          throw new Error('Failed to create game for tournament match')
        }
        fastify.db.prepare(
          'INSERT INTO game_players (game_id, player_id) VALUES (?, ?)'
        ).run(gameId, player2)
        insertMatch.run(tournamentId, gameId, nextRound, slot)
        await fastify.publishEvent(`tournament.game.ready.${player1}`, {
            gameId,
            tournamentId,
            opponentId: player2,
            round: nextRound,
            timestamp: Date.now()
          })
          await fastify.publishEvent(`tournament.game.ready.${player2}`, {
            gameId,
            tournamentId,
            opponentId: player1,
            round: nextRound,
            timestamp: Date.now()
          })
      }
    },

    async getTournamentSummary(tournamentId) {
      try {
        const check = fastify.db.prepare(
          'SELECT * FROM tournaments WHERE id = ?'
        )
        const checkTournament = check.get(tournamentId)
        if (!checkTournament) {
          throw new Error('Tournament not found')
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
          throw new Error('Tournament not found')
        }
        const rows = fastify.db.prepare(`
          SELECT
            tournament_games id AS tournamentGameId,
            tournament_games round,
            tournament_games slot,
            tournament_games status  AS gameStatus,
            tournament_games winner_id  AS gameWinnerId,
            tournament_games game_id  AS gameId,
            game_players.player_id AS playerId,
            tournament_aliases.alias AS playerAlias
          FROM tournament_games
          JOIN game_players ON game_players.game_id = tournament_games game_id
          LEFT JOIN tournament_aliases
            ON  tournament_aliases.tournament_id = tournament_games tournament_id
            AND tournament_aliases.user_id       = gp.player_id
          WHERE tournament_games tournament_id = ?
          ORDER BY tournament_games round DESC, tournament_games slot ASC
        `).all(tournamentId);
        if (!rows || rows.length === 0) {
          throw new Error('No games found for this tournament')
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
          totalGames: rows.length,
          games: []
        }
        for (const row of rows) {
          let game = summary.games.find(g => g.tournamentGameId === row.tournamentGameId);
          if (!game) {
            game = {
              tournamentGameId: row.tournamentGameId,
              round: row.round,
              slot: row.slot,
              status: row.gameStatus,
              winnerId: row.gameWinnerId,
              gameId: row.gameId,
              players: []
            };
            summary.games.push(game);
          }
          if (!game.players.some(p => p.playerId === row.playerId)) {
            game.players.push({
              playerId: row.playerId,
              playerAlias: row.playerAlias || null
            });
          }
        }
        
        return summary
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve tournament summary')  
      }
    },

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
    }
  })
}, {
  name: 'tournamentAutoHooks',
  dependencies: ['gameAutoHooks']
})
