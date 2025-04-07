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
          if (err) {
            console.error(`Error in readUser for username "${username}":`, err)
            return reject(err)
          }
          console.log(`readUser - username: "${username}", result:`, row)
          resolve(row)
        })
      })
    },
    async readUserByEmail(email) {
      return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM users WHERE email = ?'
        fastify.db.get(query, [email], (err, row) => {
          if (err) {
            console.error(`Error in readUser for email "${email}":`, err)
            return reject(err)
          }
          console.log(`readUserByEmail - email: "${email}", result:`, row)
          resolve(row)
        })
      })
    },
    async createUser(user) {
      return new Promise((resolve, reject) => {
        const { username, password, salt, email } = user
        const query = 'INSERT INTO users (username, password, salt, email) VALUES (?, ?, ?, ?)'
        fastify.db.run(query, [username, password, salt, email], function(err) {
          if (err) {
            console.error(`Error in createUser for username "${username}":`, err)
            return reject(err)
          }
          console.log(`createUser - new user ID: ${this.lastID}`)
          resolve(this.lastID)
        })
      })
    }
  })
}, {
  name: 'userAutoHooks',
  dependencies: ['database']
})
