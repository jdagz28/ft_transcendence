'use strict'

const fp = require('fastify-plugin')

const generateHash = require('./generate-hash')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.post('/signup', {
      schema: {
        body: fastify.getSchema('schema:auth:signup')
      },
      handler: async function signup (request, reply) {
        console.log('Database instance:', fastify.db)
        
        try {
          console.log('Attempting to read user by username:', request.body.username);
          const existingUser = await fastify.usersDataSource.readUser(request.body.username)
          if (existingUser) {
            const err = new Error('Username already exists')
            err.statusCode = 409
            throw err
          }
          
          console.log('Attempting to read user by email:', request.body.email);
          const emailExists = await fastify.usersDataSource.readUserByEmail(request.body.email)
          if (emailExists) {
            const err = new Error('Email already exists')
            err.statusCode = 409
            throw err
          }
        
          const { hash, salt } = await generateHash(request.body.password)
          console.log('Password hashed successfully.');

          const newUserId = await fastify.usersDataSource.createUser({
            username: request.body.username,
            password: hash,
            salt,
            email: request.body.email,
          })
          console.log('User created with ID:', newUserId)
          reply.status(201).send({ userId: newUserId })
        } catch (err) {
          console.error('Failed to create user:', err)
          reply.status(500).send({ error: 'Internal Server Error' })
        }
      }
    })
  }, {
    name: 'auth-routes',
    dependencies: [ 'userAutoHooks' ]
})

