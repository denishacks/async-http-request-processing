try {
  require('dotenv').config()
} catch (err) {
  // we are not in dev
}

module.exports = {
  port: process.env.PORT,
  timeoutMs: process.env.TIMEOUT_MS,
  amqpConnectionString: process.env.AMQP_CONNECTION_STRING,
  exchange: process.env.AMQP_EXCHANGE,
  queue: process.env.AMQP_QUEUE,
  hostname: process.env.HOSTNAME,
}
