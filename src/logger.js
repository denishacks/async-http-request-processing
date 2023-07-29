const winston = require('winston')

function createLogger (service) {
  return new winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    ],
  })
}

module.exports = { createLogger }
