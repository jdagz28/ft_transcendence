'use strict'

const fp = require('fastify-plugin')
const fs = require('fs')
const path = require('node:path')


async function defaultAssets (fastify, opts) {
  const defaultAvatarPath = path.resolve(process.cwd(), 'default_avatar.svg')
  console.log(`Default avatar path: ${defaultAvatarPath}`)
  fastify.decorate('defaultAvatar', fs.readFileSync(defaultAvatarPath, 'utf8'))
}

module.exports = fp(defaultAssets, { name: 'defaultAssets' })