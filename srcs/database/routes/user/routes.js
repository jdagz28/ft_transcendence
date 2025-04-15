'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.get('/users/:usernameORemail', {
      schema: {
        params: fastify.getSchema('schema:user:getUser')
      },
      response: { 200: fastify.getSchema('schema:user:user')},
      handler: async function getUser (request, reply) {
        try {
          const { usernameORemail } = request.params;
          console.log('Looking for:', usernameORemail)
          const user = await fastify.dbUsers.getUserByUsername(usernameORemail)
          if (!user) {
            const email = await fastify.dbUsers.getUserByEmail(usernameORemail)
            if (!email){
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
    })

  }, {
    name: 'user',
    dependencies: [ 'userAutoHooks', 'database']
})

