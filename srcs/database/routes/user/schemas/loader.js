'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./register.json'))
  fastify.addSchema(require('./user.json'))
  fastify.addSchema(require('./getUser.json')),
  fastify.addSchema(require('./getEmail.json'))
})
