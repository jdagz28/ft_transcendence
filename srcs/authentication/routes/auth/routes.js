'use strict'

const fp = require('fastify-plugin')
const bcrypt = require('bcrypt')

const generateHash = require('./generate-hash')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.post('/register', {
      schema: {
        body: fastify.getSchema('schema:auth:register')
      },
      handler: async function register (request, reply) {        
        try {
          console.log('Attempting to read user by username:', request.body.username)
          const existingUser = await fastify.usersDataSource.readUser(request.body.username)
          if (existingUser) {
            const err = new Error('Username already exists')
            err.statusCode = 409
            throw err
          }
          
      //     console.log('Attempting to read user by email:', request.body.email)
      //     const emailExists = await fastify.usersDataSource.readUserByEmail(request.body.email)
      //     if (emailExists) {
      //       const err = new Error('Email already exists')
      //       err.statusCode = 409
      //       throw err
      //     }
        
      //     const { hash, salt } = await generateHash(request.body.password)
      //     console.log('Password hashed successfully.')

      //     const newUserId = await fastify.usersDataSource.createUser({
      //       username: request.body.username,
      //       password: hash,
      //       salt,
      //       email: request.body.email,
      //     })
      //     console.log('User created with ID:', newUserId)
      //     reply.status(201).send({ userId: newUserId })
        } catch (err) {
          console.error('Failed to create user:', err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.get('/getUser', {
      schema: {
        querystring: {
          anyOf: [
            {
              type: 'object',
              required: ['username'],
              properties: {
                username: { type: 'string' }
              }
            },
            {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email' }
              }
            }
          ]
        },
        response: { 
          200: {
            type: 'object',
            properties: {
              username: { type: 'string' },
              password: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      },
      handler: async function  getUser (request, reply) {
        try {
          const { username, email } = request.query;
          let user;

          if (username) {
            console.log('Reading user by username:', username);
            user = await fastify.usersDataSource.readUser(username);
          } else if (email) {
            console.log('Reading user by email:', email);
            user = await fastify.usersDataSource.readUser(email); 
          }
          if (!user) {
            const err = new Error('User do not exist')
            err.statusCode = 404
            throw err
          }
          return {
            username: user.username,
            password: user.password,
            email: user.email
          }
        } catch (err) {
          console.error('Failed to get user:', err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.post('/authenticate', {
      schema: {
        body: fastify.getSchema('schema:auth:login'),
        response: {
          200: fastify.getSchema('schema:auth:token')
        }
      },
      handler: async function authenticateHandler(request, reply) {
        console.log('Checking user details in database')

        const user = await this.usersDataSource.readUser(request.body.username)
        if (!user) {
          const err = new Error('User do not exist')
          err.statusCode = 401
          throw err
        }

        const { hash } = await bcrypt.compare(request.body.password, user.password)
        if (hash !== user.hash) {
          const err = new Error('Incorrect password provided')
          err.statusCode = 401
          throw err
        }

        request.user = user
        console.log('Authenticated User: ' + user)
        return refreshHandler(request, reply)
      }
    })

    fastify.post('/logout', {
      onRequest: fastify.authenticate,
      handler: async function logoutHandler (request, reply) {
        request.revokeToken()
        reply.code(204)
      }
    })

    fastify.post('/refresh', {
      onRequest: fastify.authenticate,
      schema: {
        headers: fastify.getSchema('schema:auth:token-header'),
        response: {
          200: fastify.getSchema('schema:auth:token')
        }
      },
      handler: refreshHandler
    })

    async function refreshHandler(request, reply) {
      const token = await request.generateToken()
      return { token }
    }

  }, {
    name: 'auth-routes',
    dependencies: [ 'userAutoHooks' ]
})

