#!/usr/bin/env node
const args = require('yargs/yargs')(require('yargs/helpers').hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .option('directory', {
    alias: 'd',
    type: 'string',
    default: '.',
    description: 'Set directory to serve'
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    default: 8080,
    description: 'Set server port'
  })
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .argv

const server = require('http').createServer(require('./')(args))

process
  .on('SIGTERM', shutdown)
  .on('SIGQUIT', shutdown)
  .on('SIGINT', shutdown)
  .on('uncaughtException', error => {
    console.error(error)
    shutdown()
  })

function shutdown () {
  process.exit()
}

server.listen(args.port, () => {
  console.log(`Serving on port ${server.address().port}.`)
})
