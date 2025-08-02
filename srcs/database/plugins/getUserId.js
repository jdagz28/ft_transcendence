'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (fastify) {
  fastify.decorate('getUserId', async function (username) {
    const query = fastify.db.prepare(`  
      SELECT id FROM users WHERE username = ?
    `)
    const row = query.get(username)
    if (!row) {
      fastify.log.error(`User with ID ${username} not found`)
      throw new Error('User not found')
    }
    return row.id
    })
}, {
  name: 'getUserId'
})
