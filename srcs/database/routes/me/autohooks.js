'use strict'


const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')


module.exports = fp(async function meAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('dbMe', {
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

        const avatarUrl = `/avatars/${row.id}` 

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
    }
    
  })
}, {
  name: 'meAutoHooks',
  dependencies: ['database']
})
