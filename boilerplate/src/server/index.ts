//e.g server.js
import express from 'express'
import ViteExpress from 'vite-express'
import _ from 'lodash'
import { Server as SocketServer } from 'socket.io'
import { Client as OscClient, Server as OscServer } from 'node-osc'

const app = express()

const server = ViteExpress.listen(app, 7001, () =>
  console.log('Server is listening...')
)

// And then attach the socket.io server to the HTTP server
const io = new SocketServer<SocketEvents>(server)
const oscOut = new OscClient('127.0.0.1', 7001)
const oscIn = new OscServer(7004, '0.0.0.0')

// Then you can use `io` to listen the `connection` event and get a socket
// from a client
io.on('connection', socket => {
  console.log(socket.id, 'connected')
})
