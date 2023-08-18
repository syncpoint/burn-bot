import { POLICIES } from "./shared.mjs"

const buildHandler = (client, configuration) => async ({ roomId, event }) => {
  const burn = await configuration.get(roomId)

  const parts = []

  if (!burn?.after) {
    parts.push('Burning messages is disabled.')
  } else {
    parts.push(`I'll burn messages after ${burn.after.quantity} ${burn.after.quality}.`)
  }

  const policy = burn.policy ?? (process.env.POLICY ?? POLICIES.RELAXED)
  parts.push(`The policy regarding changes to the configuration is set to ${policy}.`)

  client.replyNotice(roomId, event, parts.join(' '))
}

export const register = (client, configuration, handler) => {
  handler['status'] = buildHandler(client, configuration)
}