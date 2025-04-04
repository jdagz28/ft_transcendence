'use strict'
const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async readUser(username) {
      return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users WHERE username = ?'
        fastify.db.get(query, [username], (err, row) => {
          if (err) return reject(err)
          resolve(row)
        })
      })
    },
    async createUser(user) {
      return new Promise((resolve, reject) => {
        const { username, password, salt, email } = user
        const query = 'INSERT INTO users (username, password, salt, email) VALUES (?, ?, ?, ?)'
        fastify.db.run(query, [username, password, salt, email], function(err) {
          if (err) return reject(err)
          resolve(this.lastID)
        })
      })
    }
  })
}, {
  encapsulate: true,

  dependencies: ['database']
})
