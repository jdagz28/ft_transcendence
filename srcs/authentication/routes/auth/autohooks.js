'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async readUser(usernameORemail) {
      try {
        console.log('Looking for:', usernameORemail)
        const response = await axios.get(`http://database:1919/users/${usernameORemail}`)
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          console.log('User not found')
          return null
        }
        throw err
      }
    },

    // async readUser(username) {
    //   try {
    //     const query = fastify.db.prepare('SELECT * FROM users WHERE username = ?')
    //     const row = query.get(username)
    //     fastify.log.debug(`readUser: ${username} -> %`, row)
    //     return row
    //   } catch (err) {
    //     fastify.log.error(`readUser error: ${err.message}`)
    //     throw new Error('User lookup failed')
    //   }
    // },

    // async readUserByEmail(email) {
    //   try {
    //     const query = fastify.db.prepare('SELECT * FROM users WHERE email = ?')
    //     const row = query.get(email)
    //     fastify.log.debug(`readUserByEmail: ${email} -> %j`, row)
    //     return row
    //   } catch (err) {
    //     fastify.log.error(`readUserByEmail error: ${err.message}`)
    //     throw new Error('Email lookup failed')
    //   }
    // },

    // async createUser(user) {
    //   try {
    //     const { username, password, salt, email } = user
    //     const query = fastify.db.prepare(`INSERT INTO users (username, password, salt, email) VALUES (?, ?, ?, ?)`)
    //     const result = query.run(username, password, salt, email)
    //     fastify.log.debug(`createUser: ${username} -> ID ${result.lastInsertRowid}`)
    //     return result.lastInsertRowid
    //   } catch (err) {
    //     fastify.log.error(`createUser error: ${err.message}`)
    //     throw new Error('User creation failed')
    //   }
    // }
  })
}, {
  name: 'userAutoHooks'
})
