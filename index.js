const doNotCache = require('do-not-cache')
const fs = require('fs')
const path = require('path')
const send = require('send')

module.exports = ({ directory }) => (request, response) => {
  doNotCache(response)

  if (request.method !== 'GET') return methodNotAllowed(request, response)

  const url = request.url
  const filePath = path.join(directory, url)
  fileExists(filePath, (error, exists) => {
    if (error) return internalError(request, response, error)
    if (exists) return sendFile(filePath)

    const withHTML = filePath + '.html'
    fileExists(filePath + '.html', (error, exists) => {
      if (error) return internalError(request, response, error)
      if (exists) return sendFile(withHTML)
      response.statusCode = 404
      response.end('not found')
    })
  })

  function sendFile (filePath) {
    send(request, filePath).pipe(response)
  }
}

function methodNotAllowed (request, response) {
  response.statusCode = 405
  response.end('method not allowed')
}

function internalError (request, response, error) {
  console.error(`Error: ${error.toString()}`)
  response.statusCode = 500
  response.end(error.toString())
}

function fileExists (file, callback) {
  fs.access(file, fs.constants.R_OK, error => {
    if (error) {
      if (error.code === 'ENOENT') return callback(null, false)
      else return callback(error)
    }
    callback(null, true)
  })
}
