'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')

module.exports.prefixOverride = ''
module.exports = fp(
  async function avatarRoutes (fastify, opts) {
    await fastify.register(schemas)

    fastify.get('/avatars/:userId', {
      schema: {
        params: fastify.getSchema('schema:avatar:getAvatar'),
      },
      handler: async function getAvatar (request, reply) {
        try {
          const { userId } = request.params
          const query = fastify.db.prepare(`
            SELECT avatar, mime_type FROM user_avatars WHERE user_id = ?
          `)
          const row = query.get(userId)
          let avatarBuffer = row?.avatar
          let mimeType = row?.mime_type
          
          if (!avatarBuffer && fastify.defaultAssets.defaultAvatar) {
            avatarBuffer = fastify.defaultAssets.defaultAvatar
            mimeType     = fastify.defaultAssets.defaultAvatarMime
          }
      
          if (!avatarBuffer && !mimeType) {
            reply.code(404).send('Avatar not found')
            return
          }
      
          reply
            .header('Content-Type', type.mime)
            .header('Cache-Control', 'public, max-age=3600')
            .send(avatarBuffer)
        } catch (err) { 
          fastify.log.error(`Error serving avatar for user ${request.params.userId}: ${err.message}`)
          reply.code(500).send('Internal servera error')
        }
      }
    })

  }, {
    name: 'avatar',
    dependencies: ['database']
})

