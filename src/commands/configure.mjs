import { POLICIES } from "./shared.mjs"

const help = 'You need to specify the lifetime of the messages. Like "after 10m" (for 10 minutes) or "after 1h" (for one hour). I support [m]inutes, [h]ours and [d]ays'

const names = {
  m: 'minutes',
  h: 'hours',
  d: 'days'
}

const buildHandler = (client, configuration) => async ({ roomId, event, command, params }) => {

  const policy = (await configuration.get(roomId))?.policy ?? (process.env.POLICY ?? POLICIES.RELAXED)
  const hasPermission = (policy.toLowerCase() === POLICIES.RELAXED)
    ? true
    : await client.userHasPowerLevelForAction(event.sender, roomId, 'redact')

  if (!hasPermission) {
    client.replyNotice(roomId, event, 'Sorry, only users with a power level greater than or equal to the "m.room.redaction" event power level are allowed to give me orders.')
    return
  }

  switch (command) {
    case 'disable': {
      const settings = await configuration.get(roomId)
      delete settings.after
      await configuration.put(roomId, settings)

      const message = 'OK, no more messages burning.'
      client.replyNotice(roomId, event, message)
      
      break
    }
    case 'after': {
      if (!params[0]) {
        client.replyNotice(roomId, event, help)  
        break
      }

      const canRedact = await client.userHasPowerLevelForAction(await client.getUserId(), roomId, 'redact')
      if (!canRedact) {
        client.replyNotice(roomId, event, 'Looks like I do not have enough power to redact events . Please elevate\
         my power level to be greater than or equal to the "m.room.redaction" event power level and issue the command again!\
        One way of doing so might be assigning the role "Moderator" to me.') 
        return
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

      if (quantity < 1) {
        client.replyNotice(roomId, event, `Sorry, ${quantity} is not valid.`)
        return
      }

      const settings = await configuration.get(roomId)
      settings.after = { quantity, quality: names[quality] }
      await configuration.put(roomId, settings)

      const message = `OK, burning messages after ${quantity} ${names[quality]}.`      
      client.replyNotice(roomId, event, message)

      break
    }
    case 'restrict': {
      const settings = await configuration.get(roomId)
      settings.policy = POLICIES.RESTRICTED
      await configuration.put(roomId, settings)
      client.replyNotice(roomId, event, `OK, the policy regarding changes to the configuration is set to ${settings.policy}.`)
      break
    }
    case 'relax': {
      const settings = await configuration.get(roomId)
      settings.policy = POLICIES.RELAXED
      await configuration.put(roomId, settings)
      client.replyNotice(roomId, event, `OK, the policy regarding changes to the configuration is set to ${settings.policy}.`)
      break
    }
  }
}

export const register = (client, configuration, handler) => {
  const configure = buildHandler(client, configuration)
  const commands = [
    'after',
    'disable',
    'restrict',
    'relax'
  ]
  commands.forEach(command => handler[command] = configure)
}
