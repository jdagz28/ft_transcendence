'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./createTournament.json'))
  fastify.addSchema(require('./tournamentID.json'))
  fastify.addSchema(require('./updateTournamentOptions.json'))
  fastify.addSchema(require('./alias.json'))
  fastify.addSchema(require('./inviteUser.json'))
  fastify.addSchema(require('./inviteID.json'))
  fastify.addSchema(require('./respondToInvite.json'))
  fastify.addSchema(require('./createTournamentAI.json'))
})