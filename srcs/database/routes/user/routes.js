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
          const user = await fastify.dbUsers.getUserByUsername(username)
          if (!user) {
            fastify.log.error('User not found')
            reply.code(404);
            return { error: 'User not found' }
          }
          return user
        } catch (err) {
          fastify.log.error(`Error retrieving user: ${err.message}`)
          reply.code(500)
          return { error: 'Internal Server Error' }
        }          
      }
    }),

    fastify.get('/users/:email', {
      schema: {
        params: fastify.getSchema('schema:user:getEmail')
      },
      response: { 200: fastify.getSchema('schema:user:user')},
      handler: async function getEmail (request, reply) {
        try {
          const { email } = request.params;
          constuser = await fastify.dbUsers.getUserByEmail(email)
          if (!user) {
            fastify.log.error('User not found')
            reply.code(404)
          }
          return { error: 'User not found'}
        } catch (err) {
          fastify.log.error(`Error retrieving user: ${err.message}`)
          reply.code(500)
          return { error: 'Internal Server Error`'}
        }
      } 
    })
  }, {
    name: 'user',
    dependencies: [ 'userAutoHooks', 'database']
})

