'use strict'


const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const fileTypeFromBuffer = require('file-type').fileTypeFromBuffer


module.exports = fp(async function meAutoHooks (fastify, opts) {
  fastify.register(schemas)
  const multipart = require('fastify-multipart')

  fastify.decorate('dbAvatars', {
    async createAvatar(userId, avatar) {
      try {
        const avatarBuffer = Buffer.isBuffer(avatar) ? avatar : Buffer.from(avatar)
        const type = await fileTypeFromBuffer(avatarBuffer)
        if (!type || !['image/jpeg', 'image/png', 'image/jpg'].includes(type.mime)) {
          throw new Error(`Unsupported image format: ${type?.mime || 'unknown'}`)
        }    
        const mimeType = type.mime
        const query = fastify.db.prepare(`
          INSERT INTO user_avatars (user_id, avatar, mime_type)
          VALUES (?, ?, ?)
        `)
        const result = query.run(userId, avatarBuffer, mimeType)
        fastify.log.debug(`createAvatar: ${userId} -> ID ${result.lastInsertRowid}`)
        return result.lastInsertRowid
      } catch (err) {
        fastify.log.error(`createAvatar error: ${err.message}`)
        throw new Error('Avatar creation failed')
      }
    }
  })
}, {
  name: 'avatarAutohooks',
  dependencies: ['database', 'defaultAssets']
})
