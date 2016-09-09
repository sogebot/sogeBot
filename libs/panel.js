'use strict'

var http = require('http')
var auth = require('http-auth')
var fs = require('fs')

function Panel () {
  var basic = auth.basic({
    realm: 'SogeBot - WebPanel'
  }, function (username, password, callback) {
    callback(username === global.configuration.get().panel.username && password === global.configuration.get().panel.password)
  })
  var server = http.createServer(basic, this.handleRequest)
  var io = require('socket.io')(server)

  server.listen(global.configuration.get().panel.port, function () {
    global.log.info('WebPanel is listening on %s', global.configuration.get().panel.port)
  })
}

Panel.prototype.handleRequest = function (request, response) {
  switch (request.url) {
    case '/':
      fs.readFile('./public/index.html', 'binary', function (err, file) {
        if (err) {
          response.writeHead(500, {'Content-Type': 'text/plain'})
          response.write(err + '\n')
          response.end()
          return
        }

        response.writeHead(200)
        response.write(file, 'binary')
        response.end()
      })
      break
    case '/dist/css/custom.css':
      fs.readFile('./public/dist/css/custom.css', 'binary', function (err, file) {
        if (err) {
          response.writeHead(500, {'Content-Type': 'text/plain'})
          response.write(err + '\n')
          response.end()
          return
        }

        response.writeHead(200)
        response.write(file, 'binary')
        response.end()
      })
      break
    default:
      response.writeHead(404, {'Content-Type': 'text/plain'})
      response.write('404 Not Found\n')
      response.end()
      break
  }
}

module.exports = Panel
