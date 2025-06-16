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
          email,
          nickname = username
        } = user
        const query = fastify.db.prepare(`INSERT INTO users (username, password, salt, email, nickname) VALUES (?, ?, ?, ?, ?)`)
        const result = query.run(username, password, salt, email, nickname)
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
          provider,
          nickname = username
        } = user
        const query = fastify.db.prepare(`INSERT INTO users (username, password, salt, email, nickname) VALUES (?, ?, ?, ?, ?)`)
        const result = query.run(username, password, salt, email, nickname)
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


    async getUserProfile(userId, request) {
      try {
        const query = fastify.db.prepare(`
          SELECT users.id,
            users.username,
            users.nickname,
            users.email,
            users.created
          FROM users
          WHERE users.id = ?
        `)

        const row = query.get(userId)
        if (!row) {
          fastify.log.error('User not found')
          throw new Error('User not found')
        }

        const baseURL =  "https://" + process.env.SERVER_NAME + ":" + process.env.SERVER_PORT
        const avatarUrl = baseURL + `/users/${row.id}/avatar` 

        return {
          id: row.id,
          username: row.username,
          email: row.email,
          created: row.created,
          avatar: {
            url: avatarUrl
          }
        }
      } catch (err) {
        fastify.log.error(`getUserProfile error: ${err.message}`)
        throw new Error('User profile retrieval failed')
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
          throw new Error('No friends found')
        }

        const baseURL = request.protocol + ":" + process.env.SERVER_NAME
        const friends = rows.map(row => ({
          id: row.id,
          username: row.username,
          nickname: row.nickname,
          avatar: {
            url: `${baseURL}/users/${row.id}/avatar`
          }
        }))
        return friends
      } catch (err) {
        fastify.log.error(`getFriends error: ${err.message}`)
        throw new Error('Get friends failed')
      }
    },

    async setMfaSecret(userId, secret) { 
      try {
        const check = fastify.db.prepare(`
          SELECT * FROM user_mfa WHERE user_id = ?
        `)
        const user = check.get(userId)
        let query;
        let result;
        if (!user) {
          query = fastify.db.prepare(`
            INSERT INTO user_mfa (user_id, mfa_secret, mfa_enabled)
            VALUES (?, ?, ?)
          `)
          result = query.run(userId, secret, 1)
        }
        else {
          query = fastify.db.prepare(`
            UPDATE user_mfa SET mfa_secret = ?, mfa_enabled = ? WHERE user_id = ?
          `)
          result = query.run(secret, 1, userId)
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
      try {
        const query = fastify.db.prepare(`
          SELECT mfa_secret, mfa_enabled FROM user_mfa WHERE user_id = ?
        `)
        const row = query.get(userId)
        if (!row) {
          fastify.log.error(`User not found: ${userId}`)
          throw new Error('User not found')
        }
        return { 
          mfa_secret: row.mfa_secret,
          mfa_enabled: row.mfa_enabled
        }
      } catch (err) {
        fastify.log.error(`getUserMfa error: ${err.message}`)
        throw new Error('Get user MFA failed')
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
        if (result.changes === 0) {
          fastify.log.error(`Failed to enable MFA for user ${userId}`)
          throw new Error('Enable MFA failed')
        }
        return true
      } catch (err) {
        fastify.log.error(`enableMfa error: ${err.message}`)
        throw new Error('Enable MFA failed')
      }
    }
  })
}, {
  name: 'userAutoHooks',
  dependencies: ['database', 'defaultAssets']
})
