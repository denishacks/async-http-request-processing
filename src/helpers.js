const express = require('express')

/**
 * @param {express.Request} req
 * @param {express.Response} res
 * @param {number} latencyMs
 * @return {{protocol: string, requestUrl: string, requestMethod: string, responseSize: number, status: number}}
 */
function makeHttpRequestData (req, res, latencyMs) {
  const requestUrl = req.url || req.originalUrl
  const protocol = req.protocol || (req.connection.encrypted ? 'https' : 'http')
  const requestMethod = req.method
  const status = res.statusCode
  const responseSize = (res.getHeader && Number(res.getHeader('Content-Length'))) || 0

  const httpRequest = {
    requestUrl,
    protocol,
    requestMethod,
    responseSize,
    status,
  }

  if (req.headers['user-agent'])
    httpRequest.userAgent = req.headers['user-agent']

  if (req.headers['referer'])
    httpRequest.referer = req.headers['referer']

  if (latencyMs) {
    httpRequest.latency = {
      seconds: Math.floor(latencyMs / 1e3),
      nanos: Math.floor((latencyMs % 1e3) * 1e6),
    }
  }

  return httpRequest
}

module.exports = {
  makeHttpRequestData
}
