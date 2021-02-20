const doNotCache = require('do-not-cache')
const fs = require('fs')
const path = require('path')

const contentTypes = {
  '.css': 'text/css',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.rtf': 'text/rtf',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain'
}

module.exports = ({
  // directory of files to serve
  directory = process.cwd(),
  // Are we running automated tests?
  test = false
}) => (request, response) => {
  doNotCache(response)

  if (request.method !== 'GET') return methodNotAllowed(request, response)

  const url = request.url

  // Special route for testing 500 responses.
  if (test && url === '/500') return internalError(request, response)

  const filePath = path.join(directory, url)
  if (isDotFile(filePath)) return notFound(request, response)
  tryToStream(filePath, (error, stream) => {
    if (error) return internalError(request, response, error)
    if (stream) return sendFile(filePath, stream)

    const withHTML = filePath + '.html'
    tryToStream(withHTML, (error, stream) => {
      if (error) return internalError(request, response, error)
      if (stream) return sendFile(withHTML, stream)

      const withIndex = filePath + '/index.html'
      tryToStream(withIndex, (error, stream) => {
        if (error) return internalError(request, response, error)
        if (stream) return sendFile(withIndex, stream)
        notFound(request, response)
      })
    })
  })

  function sendFile (filePath, stream) {
    const extname = path.extname(filePath).toLowerCase()
    const contentType = contentTypes[extname]
    if (contentType) {
      response.setHeader('Content-Type', contentType)
    }
    stream.pipe(response)
  }
}

function methodNotAllowed (request, response) {
  response.statusCode = 405
  response.end('method not allowed')
}

function internalError (request, response, error) {
  response.statusCode = 500
  if (error) {
    console.error(error)
    response.end(error.toString())
  } else {
    response.end()
  }
}

function tryToStream (file, callback) {
  const stream = fs.createReadStream(file)
    .once('error', error => {
      const code = error.code
      if (code === 'ENOENT') return callback(null, false)
      if (code === 'EISDIR') return callback(null, false)
      return callback(error)
    })
    .once('open', () => {
      callback(null, stream)
    })
}

function notFound (request, response) {
  response.statusCode = 404
  response.end('not found')
}

function isDotFile (filePath) {
  const split = filePath.split(path.sep)
  return split.some(element => element.startsWith('.'))
}
