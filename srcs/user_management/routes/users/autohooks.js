'use strict'

const fp = require('fastify-plugin')
const schemas = require('./schemas/loader')
const axios = require('axios')

module.exports = fp(async function userAutoHooks (fastify, opts) {
  fastify.register(schemas)

  fastify.decorate('usersDataSource', {
    async getMeById(id) {
      try {
        console.log('Getting all data for: ', id) //! DELETE
        const response = await axios.get(`http://database:${process.env.DB_PORT}/users/me`, { params: { id } })
        return response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          fastify.log.error(`User with ID ${id} not found`)
          return null
        }
        throw err 
      }
    },

    async createAvatar(form) {
      try {
        const response = await axios.put(`http://database:${process.env.DB_PORT}/users/me/avatar`, form, { headers: form.getHeaders() })
        console.log('Avatar uploaded successfully:', response.data) //! DELETE
        return response.data
      } catch (err) {
        throw err
      }
    }
  })
}, {
  name: 'userAutoHooks'
})
