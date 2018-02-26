const Promise = require('bluebird')
const CircularJSON = require('circular-json')
const md5 = require('blueimp-md5')

function setup (adapter, serverLocations, ttl = 100, salt = '', options = {}) {
  // Make sure that TTL is less or equal than 0
  if (ttl <= 0) {
    ttl = 100 // Set Default value
  }

  // Make sure that TTL Is int
  ttl = parseInt(ttl)

  // Get Memcached Instance
  const memcached = createMemcached(serverLocations, options)

  // Return Function for Axios Adapter
  return async function (req) {
    const { url, method } = req
    const key = md5(`${url}:${salt}`)
    if (method === 'get') {
      let error = null
      let response = null

      try {
        response = await memcached.getAsync(key)
        if (!response) {
          response = await adapter(req)
          await memcached.setAsync(key, CircularJSON.stringify(response), ttl)
        } else {
          response = CircularJSON.parse(response)
        }
      } catch (exception) {
        error = exception
      }

      return new Promise((resolve, reject) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    }
  }
}

function createMemcached (serverLocations, options) {
  const Memcached = require('memcached-elasticache')
  return Promise.promisifyAll(new Memcached(serverLocations))
}

module.exports = { setup }
