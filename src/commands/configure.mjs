import { ACCOUNT_DATA_TYPE, COMMAND_PREFIX } from "./shared.mjs"

const help = 'You need to specify the lifetime of the messages. Like "after 10m" (for 10 minutes) or "after 1h" (for one hour). I support [m]inutes, [h]ours and [d]ays'

const names = {
  m: 'minutes',
  h: 'hours',
  d: 'days'
}

const cache = {}

export const configure = async ({ client, roomId, event, command, params }) => {

  if (process.env.MODERATORS_ONLY === '1') {
    const canRedact = await client.userHasPowerLevelForAction(event.sender, roomId, 'redact')
    if (!canRedact) {
      client.replyNotice(roomId, event, 'Sorry, only users with a powerlevel "moderator" are allowed to give me orders.')
      return
    }
  }

  switch (command) {
    case 'disable': {
      await client.setRoomAccountData(ACCOUNT_DATA_TYPE, roomId, {})
      delete cache[roomId]

      const message = 'OK, no more messages burning'
      client.replyNotice(roomId, event, message)
      
      break
    }
    case 'after': {
      if (!params[0]) {
        client.replyNotice(roomId, event, help)  
        break
      }

      /* only minutes, hours, days are supported */
      const pattern = /(\d{1,2})([m,h,d])/i
      const matches = pattern.exec(params[0])

      if (!matches) {
        const message = `No idea what ${params[0]} means.\n${help}`
        client.replyNotice(roomId, event, message)  
        break
      }
      
      const quantity = matches[1]
      const quality = matches[2]

      const burn = { 
        after: { quantity, quality: names[quality] }
      }

      const canRedact = await client.userHasPowerLevelForAction(await client.getUserId(), roomId, 'redact')
      if (!canRedact) {
        client.replyNotice(roomId, event, 'Looks like I do not have enough power to redact events . Please elevate my powerlevel to "moderator" and issue the command again!')
        return
      }

      await client.setRoomAccountData(ACCOUNT_DATA_TYPE, roomId, burn)
      cache[roomId] = burn

      const message = `OK, burning messages after ${quantity} ${names[quality]}`      
      client.replyNotice(roomId, event, message)

      break
    }
    default: {
      const message = `unknown command: "${args[0]}".\n${help}`
      client.replyNotice(roomId, event, message)
    }
  }
}

export const shouldBurn = async (client, roomId) => {
  if (!cache[roomId]) {
    const burn = await client.getRoomAccountData(ACCOUNT_DATA_TYPE, roomId)
    if (Object.keys(burn).length > 0) {
      cache[roomId] = burn
    }
  }
  return cache[roomId]
}

export const CONFIG_COMMANDS = [
  'after',
  'disable',
  'restrict'
]