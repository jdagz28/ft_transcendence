'use strict'

const bcrypt = require('bcrypt')

async function generateHash(password, salt) {
  if (!salt) {
    salt = await bcrypt.genSalt(10)
  }
  const hash = await bcrypt.hash(password, salt)

  return { salt, hash }
}

module.exports = generateHash