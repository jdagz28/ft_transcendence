'use strict'

const fp = require('fastify-plugin')

const generateHash = require('./generate-hash')

module.exports.prefixOverride = ''
module.exports = fp(
  async function applicationAuth (fastify, opts) {
    fastify.post('/signup', {
      schema: {
        body: fastify.getSchema('schema:auth:signup')
      },
      handler: signup
    })
  }
)

async function signup (request, reply) {
  