'use strict'

const fp = require('fastify-plugin')
const { fileTypeFromBuffer } = require('file-type')
const schemas = require('./schemas/loader')

module.exports.prefixOverride = ''
module.exports = fp(
  async function avatarRoutes (fastify, opts) {
    fastify.register(schemas)

    fastify.get('/avatars/:userId', {
      schema: {
        parapms: fastify.getSchema('getAvatar'),
      },
      handler: async function getAvatar (request, reply) {
        try {
          const query = fastify.db.prepare(`
            SELECT avatar FROM user_avatars WHERE user_id = ?
          `)
          const row = query.get(id)
      
          if (!row || !row.avatar) {
            return reply.code(404).send('Avatar not found')
          }
      
          const avatarBuffer = row.avatar
          const type = await fileTypeFromBuffer(avatarBuffer)
      
          if (!type || !type.mime.startsWith('image/')) {
            return reply.code(415).send('Unsupported image format')
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

