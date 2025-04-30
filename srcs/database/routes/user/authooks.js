'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')

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
        const { username, password, salt, email } = user
        const query = fastify.db.prepare(`INSERT INTO users (username, password, salt, email) VALUES (?, ?, ?, ?)`)
        const result = query.run(username, password, salt, email)
        fastify.log.debug(`createUser: ${username} -> ID ${result.lastInsertRowid}`)
        return result.lastInsertRowid
      } catch (err) {
        fastify.log.error(`createUser error: ${err.message}`)
        throw new Error('User creation failed')
      }
    },

    async getUserProfile(userId) {
      try {
        const query = fastify.db.prepare(`
          SELECT users.id,
            users.username,
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

        return {
          id: row.id,
          username: row.username,
          email: row.email,
          created: row.created,
          avatar: row.avatar_blob
        }
      } catch (err) {
        fastify.log.error(`getUserProfile error: ${err.message}`)
        throw new Error('User profile retrieval failed')
      }
    }

  })
}, {
  name: 'userAutoHooks',
  dependencies: ['database']
})
