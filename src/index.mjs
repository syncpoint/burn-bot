import {
    AutojoinRoomsMixin,
    LogLevel,
    LogService,
    MatrixClient,
    RichConsoleLogger,
    RustSdkCryptoStorageProvider,
    SimpleFsStorageProvider
} from "matrix-bot-sdk"

import { config } from 'dotenv'
import * as path from 'path'
import { verify } from './environment.mjs'
import CommandHandler from "./commands/handler.mjs"
import { Level } from 'level'

config()

LogService.setLogger(new RichConsoleLogger())

// For now let's also make sure to log everything (for debugging)
LogService.setLevel(process.env.LOG_LEVEL || LogLevel.INFO)

LogService.info('burn-bot starting up ...')

const missing = verify([
  'MATRIX_HOMESERVER_URL',
  'MATRIX_ACCESS_TOKEN'
])

if (missing.length) {
  missing.forEach(m => LogService.error(`environment variable ${m} has no value`))
  process.exit(1)
}

const storagePath = path.join(process.cwd(), 'store', 'burn-bot.json')
LogService.debug(`Initializing StorageProvider: ${storagePath}`)
const storage = new SimpleFsStorageProvider(storagePath)

const cryptoStoragePath = path.join(process.cwd(), 'store.crypto')
LogService.debug(`Initializing CryptoStorageProvider: ${cryptoStoragePath}`)
const cryptoStorage = new RustSdkCryptoStorageProvider(cryptoStoragePath)

const client = new MatrixClient(process.env.MATRIX_HOMESERVER_URL, process.env.MATRIX_ACCESS_TOKEN, storage, cryptoStorage)

AutojoinRoomsMixin.setupOnClient(client)

const burningStorage = new Level(path.join(process.cwd(), 'burning'), { valueEncoding: 'json' })
const handler = new CommandHandler(client, burningStorage)
await handler.start()
await client.start()