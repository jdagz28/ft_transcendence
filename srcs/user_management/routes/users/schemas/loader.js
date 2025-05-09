'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./userProfile.json'))
  fastify.addSchema(require('./avatar.json'))
  fastify.addSchema(require('./changePassword.json'))
  fastify.addSchema(require('./changeEmail.json'))
})