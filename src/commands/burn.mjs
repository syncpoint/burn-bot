import { DateTime } from 'luxon'
import { LogService } from 'matrix-bot-sdk'

const burn = async (client, store, logger) => {
        
  const now = DateTime.now().toMillis()
  const predicate = { lt: now }
  
  const pending = await store.values(predicate).all()
  const burningJobs = pending.map(job => client.redactEvent(job.roomId, job.eventId))
  
  if (burningJobs.length > 0) {
    const results = await Promise.allSettled(burningJobs)

    const rejected = results
      .filter(result => result.status === 'rejected')

    const failed = rejected
      .find(result => result.reason.syscall !== undefined)

    if (failed) {
      LogService.error('Failed to redact messages due to a non-Matrix related problem. Keeping the pendig jobs.')
      return
    }

    const forbidden = rejected
      .find(result => result.reason.errcode === 'M_FORBIDDEN')
    
    if (forbidden) {
      logger.error('Some jobs were rejected! I\'ll purge the pending jobs anyway. Sorry!')
      const affectedRooms = pending.reduce((acc, _, index) => {
        if (results[index].status === 'fulfilled') return acc

        if (!acc.includes(pending[index].roomId)) {
          acc.push(pending[index].roomId)
        }
        return acc
      }, [])
      affectedRooms.forEach(roomId => {
        logger.error(`Redaction was rejected in room ${roomId}`)
        client.sendMessage(roomId, 
          {
            msgtype: 'm.text',
            body: 'Hey, looks like I am not powerful enaugh. You can either elevate my powerlevel to match "m.room.redaction" ("Moderator" level) or disable me.'
          }
        )
      })
    }
    await store.clear(predicate)
  }
}

export default burn
