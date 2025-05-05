'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./getAvatar.json'))
  fastify.addSchema(require('./avatar.json'))
})
