'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

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
    }

  })
}, {
  name: 'userAutoHooks',
  dependencies: ['database', 'defaultAssets']
})
