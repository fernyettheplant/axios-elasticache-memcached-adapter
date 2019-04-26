const Promise = require('bluebird')
const CircularJSON = require('circular-json')
const md5 = require('blueimp-md5')
const buildUrl = require('build-url')
const adapter = require('axios').defaults.adapter

function buildKey (url, queryParams, data = '', salt = '') {
  if(data == null || typeof data == 'undefined' || data == '')
    data = {}
  let fullUrl = buildUrl(url, {queryParams}, {data})
  return md5(`${fullUrl}:${JSON.stringify(data)}:${salt}`)
}

function setup (serverLocations, ttl = 100, salt = '', options = {}) {
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
    const { url, method, params, data} = req
    const key = buildKey(url, params, data, salt)
    var error = null
    var response = null
    if (method === 'get' || method === 'post') {
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
    else {
      //unsupported methods, resolve request back to axios
      return new Promise.resolve(await adapter(req))
    }
  }
}

function createMemcached (serverLocations, options) {
  const Memcached = require('memcached-elasticache')
  return Promise.promisifyAll(new Memcached(serverLocations, options))
}

module.exports = { setup }

