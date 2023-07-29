const config = require('../config')
const uuid = require('uuid')
const amqplib = require('amqplib')
const { createLogger } = require('./logger')

const hostId = config.hostname || uuid.v4()
const logger = createLogger('worker')

async function main () {
  logger.info('Started')
  const conn = await amqplib.connect(config.amqpConnectionString)
  const channel = await conn.createChannel()
  logger.info('AMQP connection opened')
  await channel.assertQueue(config.queue)

  channel.on('close', () => {
    logger.info('AMQP connection closed')
  })

  await channel.consume(config.queue, (msg) => {
    const payloadIn = JSON.parse(msg.content.toString())
    logger.info('Event received from the queue', { queue: config.queue, payload: { ...payloadIn } })

    doJob(async () => {
      const payloadOut = { ...payloadIn, hostId }

      await channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(payloadOut)))
      await channel.ack(msg)
      logger.info('Event sent into the queue', { queue: msg.properties.replyTo, payload: payloadOut })
    })
  }, { consumerTag: hostId })
}

function doJob (callback) {
  setTimeout(() => callback(), config.timeoutMs * Math.random())
}

main()
