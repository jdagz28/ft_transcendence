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

    async getUserProfile( userId) {
      try {
        const query = fastify.db.prepare(`
          SELECT users.id,
            users.username,
            users.nickname,
            users.email,
            users.created,
            user_avatars.avatar AS avatar_blob
          FROM users
          LEFT JOIN user_avatars ON users.id = user_avatars.user_id
          WHERE users.id = ?
        `)

        const row = query.get(userId)
        if (!row) {
          fastify.log.error('User not found')
          throw new Error('User not found')
        }

        const avatarUrl = `/users/${row.id}/avatar` 

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

    async sendFriendRequest(userId, friendId) {
      try {
        const check = fastify.db.prepare(`
          SELECT * FROM user_friends
          WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
        `)
        const row = check.get(userId, friendId, friendId, userId)
        if (row) {
          fastify.log.error(`User ${userId} and ${friendId} are already friends`)
          throw new Error('Users are already friends')
        }
        const query = fastify.db.prepare(`
          INSERT INTO friend_requests (requester_id, requested_id, status)
          VALUES (userId, friendId, 'pending')
        `)
        const result = query.run(userId, friendId)
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

    async respondFriendRequest(userId, friendId, status) {
      try {
        if (!['accepted', 'declined'].includes(status)) {
          throw new Error('Invalid status')
        }
        const check = fastify.db.prepare(`
          SELECT * FROM friend_requests
          WHERE requester_id = ? AND requested_id = ? AND status = 'pending'
        `)
        const row = check.get(userId, friendId)
        if (!row) {
          fastify.log.error(`No pending friend request from ${userId} to ${friendId}`)
          throw new Error('No pending friend request')
        }
        const query = fastify.db.prepare(`
          UPDATE friend_requests
          SET status = ?, 
            responded = datetime('now')
          WHERE requester_id = ? AND requested_id = ?
        `)
        const result = query.run(status, friendId, userId)
        if (result.changes === 0) {
          fastify.log.error(`No such friend request}`)
          throw new Error('Friend request not found')
        }
        if (status === 'accepted') {
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

    async deleteFriend(userId, friendId) {
      try {
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
        fastify.log.error(`deleteFriend error: ${err.message}`)
        throw new Error('Delete friend failed')
      }
    },

    async getFriends(userId) {
      try {
        const query = fastify.db.prepare(`
          SELECT users.id, users.username, users.nickname
          FROM user_friends
          JOIN users ON user_friends.user_id_a = users.id
          WHERE user_friends.user_id = ?
        `)
        let rows = query.all(userId)
        const query2 = fastify.db.prepare(`
          SELECT users.id, users.username, users.nickname
          FROM user_friends
          JOIN users ON user_friends.user_id_b = users.id
          WHERE user_friends.user_id = ?
        `)
        const rows2 = query2.all(userId)
        rows = [...rows, ...rows2]
        if (rows.length === 0) {
          fastify.log.error(`No friends found for user ${userId}`)
          throw new Error('No friends found')
        }
        return rows.map(row => ({
          id: row.id,
          username: row.username,
          nickname: row.nickname
        }))
      } catch (err) {
        fastify.log.error(`getFriends error: ${err.message}`)
        throw new Error('Get friends failed')
      }
    }


  })
}, {
  name: 'userAutoHooks',
  dependencies: ['database', 'defaultAssets']
})
