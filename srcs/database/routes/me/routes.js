'use strict'

const fp = require('fastify-plugin')

module.exports.prefixOverride = ''
module.exports = fp(
  async function me (fastify, opts) {
    fastify.get('/me', {
      schema: { 
        querystring: fastify.getSchema('schema:me:getProfile')
      },
      response: { 
        200: fastify.getSchema('schema:me:userProfile')
      },
      handler: async function getUserProfile(request, reply) {
        try {
          const userId = request.query.id
          const userProfile = await fastify.dbMe.getUserProfile(userId)
          if (!userProfile) {
            reply.code(404).send({ error: 'User profile not found' })
          } else {
            const baseURL = request.protocol + '://' + request.hostname + process.env.DB_PORT
            const url =  baseURL + userProfile.avatar.url
            userProfile.avatar.url = url
            reply.send(userProfile)
          }
        } catch (err) {
          fastify.log.error(`Error retrieving user profile: ${err.message}`)
          reply.code(500).send({ error: 'Internal Server Error' })
        }
      }
    })
  }, 
  { 
    name: 'me',
    dependencies: [ 'meAutoHooks', 'database', 'defaultAssets' ]
  }
)