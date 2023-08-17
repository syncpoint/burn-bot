import { Command } from 'commander'
import { MatrixAuth } from 'matrix-bot-sdk'

const program = new Command()
program
  .argument('<homeserverUrl>', 'The URL of the Matrix home server. "https://matrix.my-domain.com"')
  .argument('<userId>', 'Your Matrix user id. "@my-bot-id:my-domain.com"')
  .argument('<password>', 'The password of the user.')
  .action(async (homeserverUrl, userId, password) => {
    try {
      const auth = new MatrixAuth(homeserverUrl)
      const client = await auth.passwordLogin(userId, password)

      console.log(`MATRIX_HOMESERVER_URL=${homeserverUrl}`)
      console.log(`MATRIX_ACCESS_TOKEN=${client.accessToken}`)

    } catch (error) {
      console.error(error.message)
    }
  })
  .showHelpAfterError()
  .parse()


// This will be the URL where clients can reach your homeserver. Note that this might be different
// from where the web/chat interface is hosted. The server must support password registration without
// captcha or terms of service (public servers typically won't work).
/* const homeserverUrl = "https://example.org";


console.log("Copy this access token to your bot's config: ", client.accessToken); */