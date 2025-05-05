'use strict'

const fp = require('fastify-plugin')
const fs = require('fs')
const path = require('node:path')


async function defaultAssets (fastify, opts) {
  const defaultAvatarPath = path.resolve(process.cwd(), process.env.DEFAULT_AVATAR_NAME || 'default_avatar.png')
  console.log(`Default avatar path: ${defaultAvatarPath}`)
  fastify.decorate('defaultAvatar', fs.readFileSync(defaultAvatarPath, 'utf8'))

  const defaultAvatarMime =  process.env.DEFAULT_AVATAR_MIME
  fastify.decorate('defaultAvatarMime', defaultAvatarMime || 'image/jpg')
}

module.exports = fp(defaultAssets, { name: 'defaultAssets' })