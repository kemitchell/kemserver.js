const fs = require('fs')
const http = require('http')
const makeHandler = require('./')
const meta = require('./package.json')
const os = require('os')
const path = require('path')
const rimraf = require('rimraf')
const tap = require('tap')

const HTML = 'text/html; charset=UTF-8'

tap.test('GET /', test => {
  server((port, directory, close) => {
    const body = '<p>index</p>'
    const index = path.join(directory, 'index.html')
    fs.writeFile(index, body, error => {
      test.ifError(error, 'no error writing file')
      http.request({ port, path: '/' })
        .once('response', response => {
          test.equal(response.statusCode, 200, 'Status: 200')
          test.equal(response.headers['content-type'], HTML, 'Content-Type: HTML')
          const chunks = []
          response
            .on('data', chunk => { chunks.push(chunk) })
            .once('end', () => {
              const buffer = Buffer.concat(chunks)
              test.equal(buffer.toString(), body, 'Body: as written')
              close()
              test.end()
            })
        })
        .end()
    })
  })
})

tap.test('GET /apple[.html]', test => {
  server((port, directory, close) => {
    const body = '<p>apple</p>'
    const apple = path.join(directory, 'apple.html')
    fs.writeFile(apple, body, error => {
      test.ifError(error, 'no error writing file')
      http.request({ port, path: '/apple' })
        .once('response', response => {
          test.equal(response.statusCode, 200, 'Status: 200')
          test.equal(response.headers['content-type'], HTML, 'Content-Type: HTML')
          const chunks = []
          response
            .on('data', chunk => { chunks.push(chunk) })
            .once('end', () => {
              const buffer = Buffer.concat(chunks)
              test.equal(buffer.toString(), body, 'Body: as written')
              close()
              test.end()
            })
        })
        .end()
    })
  })
})

tap.test('POST /', test => {
  server((port, directory, close) => {
    http.request({ port, method: 'post' })
      .once('response', response => {
        test.equal(response.statusCode, 405, 'Status: 405')
        close()
        test.end()
      })
      .end()
  })
})

// This test calls a special test route that only works
// when the `test` option is set on the handler.
tap.test('GET /500', test => {
  server((port, directory, close) => {
    http.request({ port, path: '/500' })
      .once('response', response => {
        test.equal(response.statusCode, 500, 'Status: 500')
        close()
        test.end()
      })
      .end()
  })
})

tap.test('GET /nonexistent', test => {
  server((port, directory, close) => {
    http.request({ port, path: '/nonexistent' })
      .once('response', response => {
        test.equal(response.statusCode, 404, 'Status: 404')
        close()
        test.end()
      })
      .end()
  })
})

function server (callback) {
  // Create a temporary directory for the test.
  const tmpdir = path.join(os.tmpdir(), `${meta.name}-test`)
  fs.mkdtemp(tmpdir, (_, directory) => {
    // Create a test server.
    const server = http.createServer(makeHandler({
      directory, test: true
    }))
    // Start the server on a random high port.
    server.listen(0, () => {
      const port = server.address().port
      // Provide the port, temporary directory, and a
      // callback for cleanup after the test.
      callback(port, directory, () => {
        server.close(() => {
          // Delete the temporary directory.
          rimraf(directory, () => {
            /* pass */
          })
        })
      })
    })
  })
}
