const fs = require('fs')
const http = require('http')
const makeHandler = require('./')
const meta = require('./package.json')
const os = require('os')
const path = require('path')
const rimraf = require('rimraf')
const tap = require('tap')

const HTML = 'text/html; charset=UTF-8'

tap.test('sanity', test => {
  server((port, directory, close) => {
    const body = '<p>index</p>'
    const index = path.join(directory, 'index.html')
    fs.writeFile(index, body, error => {
      test.ifError(error, 'index write error')
      http.request({ port, path: '/' })
        .once('response', response => {
          test.equal(response.statusCode, 200, '200')
          test.equal(response.headers['content-type'], HTML, 'C-T: HTML')
          const chunks = []
          response
            .on('data', chunk => { chunks.push(chunk) })
            .once('end', () => {
              const buffer = Buffer.concat(chunks)
              test.equal(buffer.toString(), body, 'body')
              close()
              test.end()
            })
        })
        .end()
    })
  })
})

tap.test('without .html', test => {
  server((port, directory, close) => {
    const body = '<p>apple</p>'
    const apple = path.join(directory, 'apple.html')
    fs.writeFile(apple, body, error => {
      test.ifError(error, 'page write error')
      http.request({ port, path: '/apple' })
        .once('response', response => {
          test.equal(response.statusCode, 200, '200')
          test.equal(response.headers['content-type'], HTML, 'C-T: HTML')
          const chunks = []
          response
            .on('data', chunk => { chunks.push(chunk) })
            .once('end', () => {
              const buffer = Buffer.concat(chunks)
              test.equal(buffer.toString(), body, 'body')
              close()
              test.end()
            })
        })
        .end()
    })
  })
})

tap.test('POST', test => {
  server((port, directory, close) => {
    http.request({ port, method: 'post' })
      .once('response', response => {
        test.equal(response.statusCode, 405, '405')
        close()
        test.end()
      })
      .end()
  })
})

tap.test('500', test => {
  server((port, directory, close) => {
    http.request({ port, path: '/500' })
      .once('response', response => {
        test.equal(response.statusCode, 500, '500')
        close()
        test.end()
      })
      .end()
  })
})

tap.test('404', test => {
  server((port, directory, close) => {
    http.request({ port, path: '/nonexistent' })
      .once('response', response => {
        test.equal(response.statusCode, 404, '404')
        close()
        test.end()
      })
      .end()
  })
})

function server (callback) {
  const tmpdir = path.join(os.tmpdir(), `${meta.name}-test`)
  fs.mkdtemp(tmpdir, (_, directory) => {
    const server = http.createServer(makeHandler({
      directory, test: true
    }))
    server.listen(0, () => {
      const port = server.address().port
      callback(port, directory, () => {
        server.close(() => {
          rimraf(directory, () => {
            /* pass */
          })
        })
      })
    })
  })
}
