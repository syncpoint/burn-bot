import { LogService, MessageEvent, UserID } from 'matrix-bot-sdk'
import { DateTime } from 'luxon'
import { COMMAND_PREFIX } from './commands/shared.mjs'
import Configuration from './configuration.mjs'
import { register } from './commands/index.mjs'
import burn from './commands/burn.mjs'

export default class CommandHandler {
  constructor (matrixClient, store) {
    this.client = matrixClient
    this.store = store
    this.configuration = new Configuration(matrixClient)
    this.handler = {}
    register(this.client, this.configuration, this.handler)
  }

  async prepareProfile() {
    this.userId = await this.client.getUserId()
    this.localpart = new UserID(this.userId).localpart

    try {
        const profile = await this.client.getUserProfile(this.userId)
        if (profile && profile['displayname']) this.displayName = profile['displayname']
    } catch (e) {
        // Non-fatal error - we'll just log it and move on.
        LogService.warn('CommandHandler', e)
    }
  }

  async start () {
    // Populate the variables above (async)
    await this.prepareProfile()

    // Set up the event handler
    this.client.on("room.message", this.onMessage.bind(this))

    const persistedBurners = await this.store.keys().all()
    LogService.info(`There are ${persistedBurners.length} entries in the store. If this number is high there might be something wrong.`)

    this.job = setInterval(       
      burn,
      12 * 1000,  // run every 12 seconds
      this.client,
      this.store,
      LogService
    )
  }

  async onMessage(roomId, ev) {
    const event = new MessageEvent(ev)
    if (event.isRedacted) return // Ignore redacted events that come through

    if (event.textBody.startsWith(COMMAND_PREFIX)) {
      const args = event.textBody.substring(COMMAND_PREFIX.length).trim().split(' ')
      const command = args[0]?.toLowerCase()
      
      const handlingFunction = this.handler[command]
      if (handlingFunction) {
        const params = args.slice(1)
        handlingFunction({ roomId, event, command, params })
      } else {
        this.client.replyNotice(roomId, event, 'Sorry, I do not understand.')
      }
    }
    
    const burn = await this.configuration.get(roomId)
    if (!burn.after) return
    
    const duration = {}
    duration[burn.after.quality] = burn.after.quantity
    const burnAt = DateTime.now().plus(duration)

    await this.store.put(burnAt.toMillis(), { roomId, eventId: ev.event_id })
    this.client.sendReadReceipt(roomId, ev.event_id)
  }
}