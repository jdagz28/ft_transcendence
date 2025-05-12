'use strict'

const fp = require('fastify-plugin');

async function internalKeyPlugin (fastify , opts) {
  const INTERNAL_KEY = process.env.INTERNAL_KEY;
  if (!INTERNAL_KEY) {
    fastify.log.warn('INTERNAL_KEY env var is not set – guard disabled')
    return
  }

  fastify.decorate('checkInternalKey', async function (req, reply) {
    if (req.headers['x-internal-key'] !== INTERNAL_KEY) {
      return reply.unauthorized('Invalid internal key')
    }
  })
}

module.exports = fp(internalKeyPlugin, { name: 'internalKey' })

