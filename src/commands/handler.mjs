import { LogService, MessageEvent, UserID } from 'matrix-bot-sdk'
import { DateTime } from 'luxon'
import { configure, burnAfter } from './configure.mjs'
import { COMMAND_PREFIX } from './shared.mjs'

export default class CommandHandler {
  constructor (matrixClient) {
    this.client = matrixClient
    this.burningRooms = {}
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
  }

  async onMessage(roomId, ev) {
    const event = new MessageEvent(ev)
    if (event.isRedacted) return // Ignore redacted events that come through
    if (event.sender === this.userId) return

    // Ensure that the event is a command before going on. We allow people to ping
    // the bot as well as using our COMMAND_PREFIX.
    if (event.textBody.startsWith(COMMAND_PREFIX)) {
      await configure(this.client, roomId, event)
      return
    }
    
    const burn = await burnAfter(this.client, roomId)
    if (!burn) return
    
    const duration = {}
    duration[burn.after.quality] = burn.after.quantity
    const burnAt = DateTime.now().plus(duration)

    console.dir(ev)

    LogService.debug(`Will burn event after ${burn.after.quantity} ${burn.after.quality}: ${burnAt.toSeconds()}`)
    
    setTimeout(async (client, roomId, eventId) => {
        const result = await client.redactEvent(roomId, eventId)
        console.dir(result, { depth: 5 })
        LogService.debug('Removed message', roomId, eventId)
      }
      , 30 * 1000
      , this.client, roomId, ev.event_id
    )
  }
}