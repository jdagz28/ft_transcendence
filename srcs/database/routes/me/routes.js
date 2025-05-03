'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')

module.exports.prefixOverride = ''
module.exports = fp(
  async function me (fastify, opts) {
    fastify.get('/me', {
      schema: { 
        querystring: fastify.getSchema('schema:user:getProfile')
      },
      response: { 
        200: fastify.getSchema('schema:user:userProfile')
      },
      handler: async function getUserProfile(request, reply) {
        try {
          const userId = request.query.id
          const userProfile = await fastify.dbMe.getUserProfile(userId)
          if (!userProfile) {
            reply.code(404).send({ error: 'User profile not found' })
          } else {
            reply.send(userProfile)
          }
        } catch (err) {
          fastify.log.error(`Error retrieving user profile: ${err.message}`)
          reply.code(500).send({ error: 'Internal Server Error' })
        }
      }
    })

    fastify.post('/me/changeAvatar', {
      schema: {
        body: fastify.getSchema('schema:me:avatar')
      },
      handler: async function (request, reply) {
        const { userId, avatar } = request.body
        try {
          console.log('Received avatar:', avatar)
          console.log('User ID:', userId)
          await fastify.dbMe.createAvatar(userId, avatar)
          reply.send({ success: true })
        } catch (err) {
          reply.status(500).send({ error: 'Failed to update avatar' })
        }
      }
    })
  }, 
  { 
    name: 'me',
    dependencies: [ 'meAutoHooks', 'database', 'defaultAssets' ]
  }
)