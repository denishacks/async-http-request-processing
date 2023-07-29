const config = require('../config')
const amqplib = require('amqplib')

class PubSub {
  #channel
  #replyTo
  #logger
  #events = new Map()

  constructor (replyTo, logger) {
    this.#replyTo = replyTo
    this.#logger = logger
  }

  static async initialize (replyTo, logger) {
    const queue = new PubSub(replyTo, logger)
    await queue.connect()
    await queue.consume()
    return queue
  }

  async publish (payload) {
    const content = Buffer.from(JSON.stringify(payload))
    const options = { replyTo: this.#replyTo }
    await this.#channel.sendToQueue(config.queue, content, options)
    this.#logger.info('Event sent into the queue', { queue: config.queue, payload, options })
  }

  async subscribe (eventName, callback) {
    this.#events.set(eventName, callback)
  }

  async unsubscribe (eventName) {
    this.#events.delete(eventName)
  }

  async connect () {
    const connection = await amqplib.connect(config.amqpConnectionString)
    this.#channel = await connection.createChannel()
    this.#logger.info('AMQP connection opened')
    await this.#channel.assertQueue(config.queue)

    this.#channel.on('close', async () => {
      this.#logger.info('AMQP connection closed')
    })
  }

  async consume () {
    await this.#channel.assertQueue(this.#replyTo, { autoDelete: true })
    await this.#channel.consume(this.#replyTo, (msg) => {
      const payload = JSON.parse(msg.content.toString())
      this.#logger.info('Event received from the queue', { queue: config.queue, payload })

      if (!this.#events.has(payload.requestId))
        return

      const callback = this.#events.get(payload.requestId)
      callback(payload)
    }, { noAck: true })
  }
}

module.exports = { PubSub }
