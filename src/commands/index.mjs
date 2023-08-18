import { register as configure } from './configure.mjs'
import { register as status } from './status.mjs'

export const register = (client, configuration, handler) => {
  configure(client, configuration, handler)
  status(client, configuration, handler)
}