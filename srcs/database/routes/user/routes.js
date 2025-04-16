'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.get('/users/:username', {
      schema: {
        params: fastify.getSchema('schema:user:getUser')
      },
      response: { 200: fastify.getSchema('schema:user:user')},
      handler: async function getUser (request, reply) {
        try {
          const { username } = request.params;
          console.log('Looking for:', username)
          let user = await fastify.dbUsers.getUserByUsername(username)
          if (!user) {
            console.log ('User not found by username, trying email')
            user = await fastify.dbUsers.getUserByEmail(username)
            if (!user){
              fastify.log.error('User not found')
              reply.code(404);
              return { error: 'User not found' }
            }
          }
          return user
        } catch (err) {
          fastify.log.error(`Error retrieving user: ${err.message}`)
          reply.code(500)
          return { error: 'Internal Server Error' }
        }          
      }
    }),

    fastify.post('/users', {
      schema: {
        body: fastify.getSchema('schema:user:createUser'),
      },
      handler: async function createUser (request, reply) {
        try {
          const newUserId = await fastify.dbUsers.createUser(request.body)
          console.log('User created with ID:', newUserId)
          reply.status(201).send({ userId: newUserId })
        } catch (err) {
          fastify.log.error(`Error creating user: ${err.message}`)
          reply.code(500).send({ error: 'User creation failed' })
        }
      }
    })

  }, {
    name: 'user',
    dependencies: [ 'userAutoHooks', 'database']
})

