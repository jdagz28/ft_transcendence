'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')
const { fileTypeFromBuffer } = require('file-type')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('dbUsers', {
    async getUserByUsername(username) {
        const query = fastify.db.prepare('SELECT * FROM users WHERE username = ?')
        const row = query.get(username)
        return row
    },

    async getUserByEmail(email) {
        const query = fastify.db.prepare('SELECT * FROM users WHERE email = ?')
        const row = query.get(email)
        return row
    },

    async getUserById(userId) {
      const query = fastify.db.prepare('SELECT * FROM users WHERE id = ?')
      const row = query.get(userId)
      return row
    },

    async createUser(user) {
      try {
        const { 
          username, 
          password, 
          salt, 
          email
        } = user
        const query = fastify.db.prepare(`INSERT INTO users (username, password, salt, email) VALUES (?, ?, ?, ?)`)
        const result = query.run(username, password, salt, email)
        fastify.log.debug(`createUser: ${username} -> ID ${result.lastInsertRowid}`) //! DELETE
        return result.lastInsertRowid
      } catch (err) {
        fastify.log.error(`createUser error: ${err.message}`)
        throw new Error('User creation failed')
      }
    },

    async OAuthCreateUser(user) {
      try {
        const {
          username, 
          password, 
          salt, 
          email,
          provider
        } = user
        const query = fastify.db.prepare(`INSERT INTO users (username, password, salt, email) VALUES (?, ?, ?, ?)`)
        const result = query.run(username, password, salt, email)
        const userId = result.lastInsertRowid

        const oauthQuery = fastify.db.prepare(`INSERT INTO oauth (user_id, provider, provider_uid) VALUES (?, ?, ?)`)
        const result2 = oauthQuery.run(userId, provider, username)
        return result2.lastInsertRowid
      } catch (err) {
        fastify.log.error(`OAuthCreateUser error: ${err.message}`)
        throw new Error('OAuth user creation failed')
      }
    },

    async OAuthReadUser(usernameORemail) {
      try {
        fastify.log.debug(`Looking for OAuth user: ${usernameORemail}`)
        const query = fastify.db.prepare(`
          SELECT users.id, users.username, users.email, users.nickname, oauth.provider, oauth.provider_uid
          FROM users
          JOIN oauth ON users.id = oauth.user_id
          WHERE oauth.provider_uid = ? OR users.email = ? OR users.username = ?
        `)
        const row = query.get(usernameORemail, usernameORemail, usernameORemail)
        return row
      } catch (err) {
        fastify.log.error(`OAuthReadUser error: ${err.message}`)
        throw new Error('OAuth user retrieval failed')
      }
    },

    async getUserProfile(userId) {
      try {
        const userQuery = fastify.db.prepare(
          'SELECT * FROM users WHERE id = ?'
        )
        const user = userQuery.get(userId)
        if (!user) {
          throw new Error('User not found')
        }

        const gamesPlayedQuery = fastify.db.prepare(`
          SELECT COUNT(DISTINCT games.id) AS totalGames
          FROM games
          JOIN game_players ON games.id = game_players.game_id
          WHERE game_players.player_id = ? AND games.status = 'finished'
        `)
        const gamesPlayedResult = gamesPlayedQuery.get(userId)

        const recordQuery = fastify.db.prepare(`
          SELECT
              SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
              SUM(CASE WHEN winner_id != ? AND winner_id IS NOT NULL THEN 1 ELSE 0 END) as losses
          FROM games
          WHERE id IN (SELECT game_id FROM game_players WHERE player_id = ?) AND status = 'finished'
        `)
        const record = recordQuery.get(userId, userId, userId)

        const successRate = (record.wins / (gamesPlayedResult.totalGames || 1)) * 100

        const gameDaysQuery = fastify.db.prepare(`
          SELECT DISTINCT DATE(created) as game_day
          FROM games
          JOIN game_players ON games.id = game_players.game_id
          WHERE game_players.player_id = ? AND games.status = 'finished'
          ORDER BY game_day DESC
        `)
        const gameDays = gameDaysQuery.all(userId).map(d => d.game_day)

        let streak = 0
        if (gameDays.length > 0) {
          streak = 1
          let today = new Date(gameDays[0])
          for (let i = 1; i < gameDays.length; i++) {
            const previousDay = new Date(gameDays[i])
            const diffTime = today - previousDay
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays === 1) {
                streak++
                today = previousDay
            } else if (diffDays > 1) {
                break
            }
          }
        }
        const baseURL = "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT

        return {
          id: user.id,
          username: user.username,
          nickname: user.nickname || null,
          email: user.email,
          created:user.created,
          avatar: `${baseURL}/users/${user.id}/avatar`,
          daysStreak: streak,
          gamesPlayed: gamesPlayedResult.totalGames || 0,
          record: {
            wins: record.wins || 0,
            losses: record.losses || 0
          },
          successRate: parseFloat(successRate.toFixed(2))
        }
      } catch (err) {
        fastify.log.error(err)
        throw new Error('Failed to retrieve user profile')
      }
    },

    async createAvatar(userId, avatar) {
      try {
        const avatarBuffer = Buffer.isBuffer(avatar) ? avatar : Buffer.from(avatar)
        const type = await fileTypeFromBuffer(avatarBuffer)
        if (!type || !['image/jpeg', 'image/png', 'image/jpg'].includes(type.mime)) {
          throw new Error(`Unsupported image format: ${type?.mime || 'unknown'}`)
        }    
        const mimeType = type.mime
        const query = fastify.db.prepare(`
          INSERT INTO user_avatars (user_id, avatar, mime_type)
          VALUES (?, ?, ?)
        `)
        const result = query.run(userId, avatarBuffer, mimeType)
        fastify.log.debug(`createAvatar: ${userId} -> ID ${result.lastInsertRowid}`)
        return result.lastInsertRowid
      } catch (err) {
        fastify.log.error(`createAvatar error: ${err.message}`)
        throw new Error('Avatar creation failed')
      }
    },

    async updateUserDetails(userId, field, value) {
      const allowedFields = ['nickname', 'username', 'email']
      if (!allowedFields.includes(field)) {
        throw new Error('Invalid field for update')
      }

      const query = fastify.db.prepare(`
        UPDATE users
          SET ${field} = ?
        WHERE id = ?
      `)

      const result = query.run(value, userId)
      if (result.changes === 0) {
        fastify.log.error(`Failed to update user ${userId} field ${field}`)
        throw new Error('User update failed')
      }
      return true
    },

    async updatePassword(userId, hashedPassword, salt) {
      const query = fastify.db.prepare(`
        UPDATE users
          SET password = ?, salt = ?
        WHERE id = ?
      `)
      const result = query.run(hashedPassword, salt, userId)
      if (result.changes === 0) {
        fastify.log.error(`Failed to update password for user ${userId}`)
        throw new Error('Password update failed')
      }
      return true
    },

    getExistingRequest (userIdA, userIdB) {
      const query = fastify.db.prepare(`
        SELECT id, requester_id, recipient_id, status
        FROM friend_requests
        WHERE (requester_id = ? AND recipient_id = ?)
          OR (requester_id = ? AND recipient_id = ?)
        LIMIT 1
      `);
      return query.get(userIdA, userIdB, userIdB, userIdA);
    },

    //! TODO: Re-send friend request if it was declined or friendship was removed
    async sendFriendRequest(userId, friend) {
      try {
        const friendId = await fastify.getUserId(friend)
        if (friendId === userId) {
          fastify.log.error(`User ${userId} cannot send a friend request to themselves`)
          throw new Error('Cannot send friend request to self')
        }

        if (!friendId) {
          fastify.log.error(`Invalid friend ID: ${friendId}`)
          throw new Error('Invalid friend ID')
        }

        const check = fastify.db.prepare(`
          SELECT 1 FROM user_friends
          WHERE (user_id_a = ? AND user_id_b = ?) OR (user_id_a = ? AND user_id_b = ?)
          LIMIT 1
        `)
        const row = check.get(userId, friendId, friendId, userId)
        if (row) {
          fastify.log.error(`User ${userId} and ${friendId} are already friends`)
          throw new Error('Users are already friends')
        }

        const requestCheck = this.getExistingRequest(userId, friendId)
        if (requestCheck) {
          if (requestCheck.status === 'pending') {
            fastify.log.error(`Friend request already sent from ${userId} to ${friendId}`)
            throw new Error('Friend request already sent')
          } 
        }
        const query = fastify.db.prepare(`
          INSERT INTO friend_requests (requester_id, recipient_id, status, created)
          VALUES (?, ?, 'pending', datetime('now'))
        `)
        const result = query.run(userId, friendId)
        if (result.changes === 0) {
          fastify.log.error(`Failed to send friend request from ${userId} to ${friendId}`)
          throw new Error('Friend request failed')
        }

        const username = fastify.db.prepare('SELECT username FROM users WHERE id = ?').get(userId)
        await fastify.notifications.friendRequest(userId, friendId, username.username)

        return true
      } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          fastify.log.error(`Friend request already exists between ${userId} and ${friendId}`)
          throw new Error('Friend request already exists')
        }
        fastify.log.error(`addFriend error: ${err.message}`)
        throw new Error('Add friend failed')
      }
    },

    async removeFriend(userId, friend) {
      try {
        const friendId = await fastify.getUserId(friend)
        if (friendId === userId) {
          fastify.log.error(`User ${userId} is not a friend of themselves`)
          throw new Error('Cannot remove self as friend')
        }

        if (!friendId) {
          fastify.log.error(`Invalid friend ID: ${friendId}`)
          throw new Error('Invalid friend ID')
        }

        const query = fastify.db.prepare(`
          DELETE FROM user_friends
          WHERE (user_id_a = ? AND user_id_b = ?) OR (user_id_a = ? AND user_id_b = ?)
        `)
        const result = query.run(userId, friendId, friendId, userId)
        if (result.changes === 0) {
          fastify.log.error(`No such friendship between ${userId} and ${friendId}`)
          throw new Error('Friendship not found')
        }
        return true
      } catch (err) {
        fastify.log.error(`removeFriend error: ${err.message}`)
        throw new Error('Delete friend failed')
      }
    },

    async respondFriendRequest(userId, friend, action) {
      try {
        const friendId = await fastify.getUserId(friend)
        if (friendId === userId) {
          fastify.log.error(`User ${userId} can not respond to their own request`)
          throw new Error('Cannot respond to own request')
        }

        if (!friendId) {
          fastify.log.error(`Invalid friend ID: ${friendId}`)
          throw new Error('Invalid friend ID')
        }

        if (!['accept', 'decline'].includes(action)) {
          throw new Error('Invalid action')
        }
        const check = fastify.db.prepare(`
          SELECT * FROM friend_requests
          WHERE requester_id = ? AND recipient_id = ? AND status = 'pending'
        `)
        const row = check.get(friendId, userId)
        if (!row) {
          fastify.log.error(`No pending friend request from ${friendId} to ${userId}`)
          throw new Error('No pending friend request')
        }
        const query = fastify.db.prepare(`
          UPDATE friend_requests
          SET status = ?, 
            responded = datetime('now')
          WHERE requester_id = ? AND recipient_id = ?
        `)
        const result = query.run(action, friendId, userId)
        if (result.changes === 0) {
          fastify.log.error(`No such friend request}`)
          throw new Error('Friend request not found')
        }
        if (action === 'accept') {
          const insertQuery = fastify.db.prepare(`
            INSERT INTO user_friends (user_id_a, user_id_b)
            VALUES (?, ?)
          `)
          insertQuery.run(userId, friendId)
        }
        return true
      } catch (err) {
        fastify.log.error(`respondFriendRequest error: ${err.message}`)
        throw new Error('Respond to friend request failed')
      }
    },

    async getUserFriends(username, request) {
      try {
        const userId = await fastify.getUserId(username)
        if (!userId) {
          fastify.log.error(`User not found: ${username}`)
          throw new Error('User not found')
        }
        const query = fastify.db.prepare(`
          SELECT 
            users.id, 
            users.username, 
            users.nickname
          FROM   user_friends 
          JOIN   users ON users.id = user_friends.user_id_b
          WHERE  user_friends.user_id_a = ?
          
          UNION ALL
          SELECT 
            users.id, 
            users.username, 
            users.nickname
          FROM   user_friends 
          JOIN   users ON users.id = user_friends.user_id_a
          WHERE  user_friends.user_id_b = ?
        `)
        const rows = query.all(userId, userId)
        if (rows.length === 0) {
          fastify.log.error(`No friends found for user ${userId}`)
          return []
        }

        const baseURL = "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT
        const friends = rows.map(row => ({
          id: row.id,
          username: row.username,
          nickname: row.nickname || null,
          avatar: `${baseURL}/users/${row.id}/avatar`
        }))
        return friends
      } catch (err) {
        fastify.log.error(`getFriends error: ${err.message}`)
        throw new Error('Get friends failed')
      }
    },

    async setMfaSecret(userId, secret, mfaType = 'totp') { 
      try {
        const check = fastify.db.prepare(`
          SELECT * FROM user_mfa WHERE user_id = ?
        `)
        const user = check.get(userId)
        let query;
        let result;
        if (!user) {
          query = fastify.db.prepare(`
            INSERT INTO user_mfa (user_id, mfa_secret, mfa_enabled, mfa_type)
            VALUES (?, ?, ?, ?)
          `)
          result = query.run(userId, secret, 1, mfaType)
        }
        else {
          query = fastify.db.prepare(`
            UPDATE user_mfa SET mfa_secret = ?, mfa_enabled = ?, mfa_type = ? WHERE user_id = ?
          `)
          result = query.run(secret, 1, mfaType, userId)
        }
        if (result.changes === 0) {
          fastify.log.error(`Failed to set MFA secret for user ${userId}`)
          throw new Error('MFA secret update failed')
        }
        return true
      } catch (err) {
        fastify.log.error(`setMfaSecret error: ${err.message}`)
        throw new Error('Set MFA secret failed')
      }
    },

    async getUserMfa(userId) {
      const query = fastify.db.prepare(`
        SELECT mfa_secret, mfa_enabled, mfa_type FROM user_mfa WHERE user_id = ?
      `)
      const row = query.get(userId)
      if (!row) {
        fastify.log.error(`User not found: ${userId}`)
        return {
          mfa_secret: null,
          mfa_enabled: false,
          mfa_type: 'totp'
        }
      }
      return { 
        mfa_secret: row.mfa_secret,
        mfa_enabled: row.mfa_enabled,
        mfa_type: row.mfa_type
      }
    },

    async disableMfa(userId) {
      try {
        const query = fastify.db.prepare(`
          UPDATE user_mfa SET mfa_enabled = 0 WHERE user_id = ?
        `)
        const result = query.run(userId)
        if (result.changes === 0) {
          fastify.log.error(`Failed to disable MFA for user ${userId}`)
          throw new Error('Disable MFA failed')
        }
        return true
      } catch (err) {
        fastify.log.error(`disableMfa error: ${err.message}`)
        throw new Error('Disable MFA failed')
      }
    },

    async enableMfa(userId) {
      try {
        const query = fastify.db.prepare(`
          UPDATE user_mfa SET mfa_enabled = 1 WHERE user_id = ?
        `)
        const result = query.run(userId)
        const check = fastify.db.prepare(`
          SELECT * FROM user_mfa WHERE user_id = ?
        `).get(userId)
        console.log(check);
        if (result.changes === 0) {
          fastify.log.error(`Failed to enable MFA for user ${userId}`)
          throw new Error('Enable MFA failed')
        }
        return true
      } catch (err) {
        fastify.log.error(`enableMfa error: ${err.message}`)
        throw new Error('Enable MFA failed')
      }
    },

    async setMfaQrCode(userId, qrCode) {
      try {
        const check = fastify.db.prepare(`
          SELECT * FROM user_mfa WHERE user_id = ?
        `)
        const user = check.get(userId)
        let result;
        if (!user) {
          const query = fastify.db.prepare(`
            INSERT INTO user_mfa (user_id, qr_code) VALUES (?, ?)
          `)
          result = query.run(userId, qrCode)
        } else {
          const query = fastify.db.prepare(`
            UPDATE user_mfa SET qr_code = ? WHERE user_id = ?
          `)
          result = query.run(qrCode, userId)
        }
        if (result.changes === 0) {
          fastify.log.error(`Failed to set MFA QR code for user ${userId}`)
          throw new Error('Set MFA QR code failed')
        }
        return qrCode
      } catch (err) {
        fastify.log.error(`setMfaQrCode error: ${err.message}`)
        throw new Error('Set MFA QR code failed')
      }
    },

    async getMfaDetails(userId) {
      try {
        const query = fastify.db.prepare(`
          SELECT * FROM user_mfa WHERE user_id = ?
        `)
        const row = query.get(userId)
        if (!row) {
          return { mfa_enabled: false, qr_code: null, mfa_type }
        }
        return { 
          mfa_enabled: row.mfa_enabled,
          qr_code: row.qr_code,
          mfa_type: row.mfa_type
        }
      } catch (err) {
        fastify.log.error(`getMfaDetails error: ${err.message}`)
        throw new Error('Get MFA details failed')
      }
    },

    async setMfaType(userId, mfaType) {
      try {
        const query = fastify.db.prepare(`
          UPDATE user_mfa SET mfa_type = ? WHERE user_id = ?
        `)
        const result = query.run(mfaType, userId)
        if (result.changes === 0) {
          fastify.log.error(`Failed to set MFA type for user ${userId}`)
          throw new Error('Set MFA type failed')
        }
        return true
      } catch (err) {
        fastify.log.error(`setMfaType error: ${err.message}`)
        throw new Error('Set MFA type failed')
      }
    },

    async setMfaToken(userId, token) {
      try {
        const query = fastify.db.prepare(`
          UPDATE user_mfa SET mfa_token = ?, created = CURRENT_TIMESTAMP WHERE user_id = ?
        `)
        const result = query.run(token, userId)
        if (result.changes === 0) {
          fastify.log.error(`Failed to set MFA token for user ${userId}`)
          throw new Error('Set MFA token failed')
        }
        return true
      } catch (err) {
        fastify.log.error(`setMfaToken error: ${err.message}`)
        throw new Error('Set MFA token failed')
      }
    },

    async getMfaToken(userId) {
      try {
        const query = fastify.db.prepare(`
          SELECT mfa_token, created FROM user_mfa WHERE user_id = ?
        `)
        const row = query.get(userId)
        if (!row) {
          fastify.log.error(`User not found: ${userId}`)
          throw new Error('User not found')
        }
        return {
          mfa_token: row.mfa_token,
          created: row.created
        }
      } catch (err) {
        fastify.log.error(`getMfaToken error: ${err.message}`)
        throw new Error('Get MFA token failed')
      }
    },

    async getMatchHistory(userId) {
      try {
        const check = fastify.db.prepare('SELECT id FROM users WHERE id = ?')
        const user = check.get(userId)
        if (!user) {
          throw new Error('User not found')
        }
        
        const historyQuery = fastify.db.prepare(`
          SELECT
            games.id as gameId,
            games.created,
            games.ended,
            game_players.paddle_loc as userPaddleLoc,
            game_settings.num_games || '-' || game_settings.num_matches as gameOptions,
            CASE WHEN games.winner_id = ? THEN 'W' ELSE 'L' END as result
          FROM games
          JOIN game_players ON games.id = game_players.game_id
          JOIN game_settings ON games.id = game_settings.game_id
          WHERE game_players.player_id = ? AND games.status = 'finished'
          ORDER BY games.created DESC
        `)
        
        const opponentQuery = fastify.db.prepare(`
          SELECT users.username 
          FROM users
          JOIN game_players ON users.id = game_players.player_id
          WHERE game_players.game_id = ? AND game_players.paddle_loc != ?
        `)
        
        const matchScoresQuery = fastify.db.prepare(`
          SELECT 
            game_matches.game_id,
            game_matches.id,
            match_scores.player_id,
            match_scores.score,
            game_players.paddle_loc
          FROM game_matches
          JOIN match_scores ON game_matches.id = match_scores.match_id
          JOIN game_players ON match_scores.player_id = game_players.player_id AND game_matches.game_id = game_players.game_id
          WHERE game_matches.game_id = ?
          ORDER BY game_matches.id
        `)
        
        const games = historyQuery.all(user.id, user.id)
        
        return games.map(game => {
          const opponent = opponentQuery.get(game.gameId, game.userPaddleLoc)?.username 
          
          const matchScores = matchScoresQuery.all(game.gameId)
          
          const matchScoresByMatch = {}
          matchScores.forEach(score => {
            const matchNumber = score.id
            if (!matchScoresByMatch[matchNumber]) {
              matchScoresByMatch[matchNumber] = {
                matchId: matchNumber
              }
            }
            matchScoresByMatch[matchNumber][score.paddle_loc] = score.score
          })
          
          const matchScoresArray = []
          let userWins = 0
          let opponentWins = 0
          
          Object.values(matchScoresByMatch).forEach(match => {
            const opponentPaddleLoc = Object.keys(match).find(key => 
              key !== 'matchId' && key !== game.userPaddleLoc
            )
            const userScore = match[game.userPaddleLoc] || 0
            const opponentScore = match[opponentPaddleLoc] || 0
            
            matchScoresArray.push({
              matchId: match.matchId,
              userScore,
              opponentScore,
              scoreString: `${userScore}-${opponentScore}`
            })
            
            if (userScore > opponentScore) userWins++
            else if (opponentScore > userScore) opponentWins++
          })
          
          return {
            gameId: game.gameId,
            created: game.created,
            ended: game.ended,
            result: game.result,
            finalScore: `${userWins} - ${opponentWins}`,
            opponent: opponent,
            matchScores: matchScoresArray,
            gameOptions: game.gameOptions,
            duration: game.ended && game.created ? Math.round((new Date(game.ended) - new Date(game.created)) / 1000) + 's' : 'N/A'
          }
        })
      } catch(err) {
        fastify.log.error(err)
        throw new Error('Failed to get match history')
      }
    },

    async getFriendRequests(userId) {
      try {
        const query = fastify.db.prepare(`
          SELECT 
            friend_requests.id,
            users.id AS userId,
            friend_requests.requester_id,
            users.username, 
            friend_requests.created
          FROM friend_requests
          JOIN users ON friend_requests.requester_id = users.id
          WHERE friend_requests.recipient_id = ? AND friend_requests.status = 'pending'
        `)
        const rows = query.all(userId)
        if (rows.length === 0) {
          return []
        }
        const baseURL = "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT
        return rows.map(row => ({
          id: row.id,
          requesterUsername: row.username,
          created: row.created,
          avatar: `${baseURL}/users/${row.userId}/avatar`
        }))
      } catch (err) {
        fastify.log.error(`getFriendRequests error: ${err.message}`)
        throw new Error('Get friend requests failed')
      }
    }


  })
}, {
  name: 'userAutoHooks',
  dependencies: ['database', 'defaultAssets']
})
