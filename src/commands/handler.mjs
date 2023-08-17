import { LogService, MessageEvent, UserID } from 'matrix-bot-sdk'
import { DateTime } from 'luxon'
import { configure, shouldBurn } from './configure.mjs'
import { COMMAND_PREFIX } from './shared.mjs'

export default class CommandHandler {
  constructor (matrixClient) {
    this.client = matrixClient
    this.willBeBurning = []
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

    this.job = setInterval(async (client, candidates) => {
        if (candidates.length === 0) return
        const now = DateTime.now().toMillis()

        const burningJobs = []
        while (candidates.length > 0 && candidates[0].burnAt <= now) {
          const burner = candidates.shift()
          burningJobs.push(client.redactEvent(burner.roomId, burner.eventId))
        }
        // Maybe we should check the results and retry if it did not work?
        await Promise.all(burningJobs)
      },
      10 * 1000,  // run every 10 seconds
      this.client,
      this.willBeBurning
    )
  }

  async onMessage(roomId, ev) {
    const event = new MessageEvent(ev)
    if (event.isRedacted) return // Ignore redacted events that come through
    if (event.sender === this.userId) return

    if (event.textBody.startsWith(COMMAND_PREFIX)) {
      await configure(this.client, roomId, event)
      return
    }
    
    const burn = await shouldBurn(this.client, roomId)
    if (!burn) return
    
    const duration = {}
    duration[burn.after.quality] = burn.after.quantity
    const burnAt = DateTime.now().plus(duration)

    this.willBeBurning.push({ roomId, eventId: ev.event_id, burnAt: burnAt.toMillis() })

    LogService.debug(`Will burn event after ${burn.after.quantity} ${burn.after.quality}: ${burnAt.toISO()}`)
  }
}