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
        fastify.log.debug(`createUser: ${username} -> ID ${result.lastInsertRowid}`)
        try { 
          const url = 'http://localhost:1919/me/changeAvatar';
          const response = await axios.post(url, {
            userId: result.lastInsertRowid, 
            avatar: fastify.defaultAvatar
          })
          if (response.status !== 200) {
            throw new Error('Failed to assign default avatar')
          }
        }
        catch (error) {
          fastify.log.error(`Error /me/changeAvatar: ${error.message}`)
          throw new Error('Avatar assignment failed')
        }
        return result.lastInsertRowid
      } catch (err) {
        fastify.log.error(`createUser error: ${err.message}`)
        throw new Error('User creation failed')
      }
    }
  })
}, {
  name: 'userAutoHooks',
  dependencies: ['database', 'defaultAssets']
})
