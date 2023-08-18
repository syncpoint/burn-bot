# The burn-bot

In contrary to other messaging systems Matrix does not support vanishing messages where messages in a room (or group) disappear after a given time.
The _burning bot_ aims to solve this issue and implements a very simple strategy where messages are redacted (aka deleted) after a configurable period of time.

The bot will check periodically (currently five times per minute) if there are messages to delete.

__Warning__: This bot is neither designed for rooms with a high number of members nor for handling a huge amount of messages.

## Prerequisits

Since this is implemented as a bot it needs a dedicated user account with the appropriate permissions to do it's job.

## Installing

The bot is written in JavaScript and needs the NodeJS runtime version 16 or newer:

```bash
git clone https://github.com/syncpoint/burn-bot.git
cd burn-bot
npm install
```

## Configuration

To make the bot work you need to provide values for two environment variables `MATRIX_HOMESERVER_URL` (is the url of your matrix homeserver) and `MATRIX_ACCESS_TOKEN` 
is an access token of the user you want to use.

In order to generate an access token call `npm run login` with the required parameters:
```
npm run login --help

Usage: login [options] <homeserverUrl> <userId> <password>

Arguments:
  homeserverUrl  The URL of the Matrix home server. I.e. "https://matrix.my-domain.com"
  userId         Your Matrix user id. I.e. "@my-bot-id:my-domain.com"
  password       The password of the user.

Options:
  -h, --help     display help for command
```

```
npm run login https://matrix.your-homeserver.url @your-bot-name:your-homeserver.url **secret**
```

On success you will be provided with the environment variables mentioned above:

```
MATRIX_HOMESERVER_URL=https://matrix.your-homeserver.url
MATRIX_ACCESS_TOKEN=syt_bGlz*************************1g6HqF
```

You may persist these environment variables by making use of a `.env` file.

## Running the bot

Just fire up `npm start`. If you'd like to increase the amount of log output you can do so by giving the environment variable `LOG_LEVEL` a value of `DEBUG`.

## Makeing it work

In order to make messages disappear you need to
* invite the bot user to join a room. Since _auto-join_ is enabled the bot will accept every invitation.
* elevate the permissions of the bot user to `moderator` level. Without doing so the bot will fail because removing messages requires appropriate power levels.

## Restricting configuration to powerlevel "Moderator"

I you want to limit the ability to make changes to users with the powerlevel of "Moderator" set the environment variable `MODERATORS_ONLY=1`. The bot will discharge all
attempts to make changes and send a reply to the user.

## Interacting with the bot

The bot listens for messages and acts on commands that start with `!burn`. The available commands are
* `!burn after <quantity><quality>`: where 
  `<quantity>` is a positive interger > 0
  `<quality>` is one out of [m,h,d] (minutes, hours, days)

  If you want to set the time-to-live for messages to 15 minutes post `!burn after 15m`. The bot will confirm your command if it was successful or send an error message otherwise.

* `!burn disable`: Disables burning messages for the current room. This affects only messages that are sent AFTER disabling the bot. Messages that are already marked for deletion will be deleted anyway.

## Read receipts

In order to give a (visual) feedback the bot sends a read receipt for every message that is affected by the current burning strategy. If burning is disabled the read receipts will
not be sent as well.

## Persistence

### Configuration
The configuration of the burning bot is stored in the rooms' `accountData`.

### Jobs
Which messages will be deleted and when is stored in a key-value store. If you restart the bot it will check for pending jobs and execute them.