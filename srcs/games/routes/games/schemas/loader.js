'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function schemaLoaderPlugin (fastify, opts) {
  fastify.addSchema(require('./createGame.json'))
  fastify.addSchema(require('./gameID.json'))
  fastify.addSchema(require('./createTournament.json'))
  fastify.addSchema(require('./updateGameOptions.json'))
  fastify.addSchema(require('./tournamentID.json'))
  fastify.addSchema(require('./startGame.json'))
  fastify.addSchema(require('./gameDetails.json'))
  fastify.addSchema(require('./updateGameStatus.json'))
  fastify.addSchema(require('./updateTournamentOptions.json'))
})