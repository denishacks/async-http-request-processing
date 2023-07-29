const config = require('../config')
const uuid = require('uuid')
const express = require('express')
const { createLogger } = require('./logger')
const { PubSub } = require('./pubsub')
const { makeHttpRequestData } = require('./helpers')
const process = require('process')

const X_REQUEST_ID = 'x-request-id'
const hostId = config.hostname || uuid.v4()
const logger = createLogger('web')

async function main () {
  logger.info('Started', { pid: process.pid })
  const queue = await PubSub.initialize(hostId, logger)

  const app = express()
  app.use(express.static('web')) // for dev

  app.use(catchWrapper((req, res, next) => {
    const requestStartMs = Date.now()

    if (!req.get(X_REQUEST_ID))
      req.headers[X_REQUEST_ID] = uuid.v4()

    req.logger = logger.child({
      requestId: req.get(X_REQUEST_ID),
    })

    req.on('end', () => {
      const latencyMs = Date.now() - requestStartMs
      const httpRequest = makeHttpRequestData(req, res, latencyMs)

      req.logger.info({
        httpRequest,
        message: `${httpRequest.requestMethod} ${httpRequest.requestUrl}`,
      })
    })
    next()
  }))

  app.use(catchWrapper((req, res, next) => {
    res.removeHeader('x-powered-by')
    next()
  }))

  app.use(catchWrapper(async (req, res, next) => {
    const ts = Date.now()
    const requestId = req.get(X_REQUEST_ID)
    req.logger.info('Request received')

    const timeoutId = setTimeout(() => {
      queue.unsubscribe(requestId)
      res.statusCode = 504
      res.end()
      req.logger.info('Request timed out')
    }, config.timeoutMs)

    await queue.subscribe(requestId, (payload) => {
      clearTimeout(timeoutId)
      res.write(`timestamp: ${ts}\n`)
      res.write(`request id: ${payload.requestId}\n`)
      res.write(`web host id: ${hostId}\n`)
      res.write(`worker host id: ${payload.hostId}\n`)
      res.end()
      req.logger.info('Response sent to the client')
    })

    await queue.publish({ requestId, ts })
  }))

  app.use((err, req, res, next) => {
    req.logger.error(err)
    res.statusCode = 500
    res.send('Oops! Something wrong :(')
  })

  app.listen(config.port, () => logger.info('App is listening on port ' + config.port))
}

function catchWrapper (asyncCallback) {
  return async (req, res, next) => {
    try {
      await asyncCallback(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}

main()
