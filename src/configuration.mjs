const ACCOUNT_DATA_TYPE = 'io.syncpoint.burn-bot'

class Configuration {
  constructor (client) {
    this.client = client
    this.cache = {}
  }

  get = async (roomId) => {
    if (!this.cache[roomId]) {
      try {
        const remote = await this.client.getRoomAccountData(ACCOUNT_DATA_TYPE, roomId)
        this.cache[roomId] = (remote ?? {})
      } catch (error) {
        this.cache[roomId] = {}
      }
    }
    return this.cache[roomId]
  }

  put = async (roomId, value) => {
    await this.client.setRoomAccountData(ACCOUNT_DATA_TYPE, roomId, value)
    this.cache[roomId] = value
  }
}

export default Configuration
