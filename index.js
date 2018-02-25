const Promise = require('bluebird')
const CircularJSON = require('circular-json')

function setup (adapter, serverLocations, ttl = 60, options = {}) {
  // Get Memcached Instance
  const memcached = createMemcached(serverLocations, options)

  // Return Function for Axios Adapter
  return async function (req) {
    const { url, method } = req
    if (method === 'get') {
      let error = null
      let response = null

      try {
        response = await memcached.getAsync(url)
        if (!response) {
          response = await adapter(req)
          await memcached.setAsync(url, CircularJSON.stringify(response), ttl)
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
