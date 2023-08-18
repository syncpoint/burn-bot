import { LogService, MessageEvent, UserID } from 'matrix-bot-sdk'
import { DateTime } from 'luxon'
import { configure, shouldBurn } from './configure.mjs'
import { COMMAND_PREFIX } from './shared.mjs'
import { CONFIG_COMMANDS } from './configure.mjs'

export default class CommandHandler {
  constructor (matrixClient, store) {
    this.client = matrixClient
    this.store = store
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

    this.job = setInterval(async (client, store) => {
        
        const now = DateTime.now().toMillis()
        const predicate = { lt: now }
        const burningJobs = []
        
        for await (const burning of store.values(predicate)) {
          burningJobs.push(client.redactEvent(burning.roomId, burning.eventId))
        }
        
        if (burningJobs.length > 0) {
          // Maybe we should check the results and retry if it did not work?
          await Promise.all(burningJobs)
          await store.clear(predicate)
        }       
      },
      12 * 1000,  // run every 12 seconds
      this.client,
      this.store
    )
  }

  async onMessage(roomId, ev) {
    const event = new MessageEvent(ev)
    if (event.isRedacted) return // Ignore redacted events that come through
    if (event.sender === this.userId) return

    if (event.textBody.startsWith(COMMAND_PREFIX)) {
      const args = event.textBody.substring(COMMAND_PREFIX.length).trim().split(' ')
      const command = args[0]?.toLowerCase()
      const params = args.slice(1)
      if (CONFIG_COMMANDS.includes(command)) {
        return configure({
          client: this.client,
          roomId,
          event,
          command,
          params
        })
      } else {
        this.client.replyNotice(roomId, event, 'Sorry, I do not understand.')
      }
      
    }
    
    const burn = await shouldBurn(this.client, roomId)
    if (!burn) return
    
    const duration = {}
    duration[burn.after.quality] = burn.after.quantity
    const burnAt = DateTime.now().plus(duration)

    await this.store.put(burnAt.toMillis(), { roomId, eventId: ev.event_id })
    this.client.sendReadReceipt(roomId, ev.event_id)
  }
}