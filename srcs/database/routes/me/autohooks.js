'use strict'


const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')


module.exports = fp(async function meAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('dbMe', {
    async getUserProfile(userId) {
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

        return {
          id: row.id,
          username: row.username,
          email: row.email,
          created: row.created,
          avatar: {
            url: `/avatars/${row.id}`
          }
        }
      } catch (err) {
        fastify.log.error(`getUserProfile error: ${err.message}`)
        throw new Error('User profile retrieval failed')
      }
    },
    
    async createAvatar(userId, avatar) {
      try {
        const query = fastify.db.prepare(`INSERT INTO user_avatars (user_id, avatar) VALUES (?, ?)`)
        const result = query.run(userId, avatar)
        fastify.log.debug(`createAvatar: ${userId} -> ID ${result.lastInsertRowid}`)
        return result.lastInsertRowid
      } catch (err) {
        fastify.log.error(`createAvatar error: ${err.message}`)
        throw new Error('Avatar creation failed')
      }
    },
  })
}, {
  name: 'meAutoHooks',
  dependencies: ['database', 'defaultAssets']
})
