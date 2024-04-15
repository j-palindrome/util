import { useEffect, useState } from 'react'
import { SocketProvider } from './context'
import { useAppStore } from './store'
import { Socket, io } from 'socket.io-client'
import Scene from './components/Scene'

function App() {
  const sample = useAppStore((state) => ({}))
  const [socket, setSocket] = useState<Socket<SocketEvents>>()

  useEffect(() => {
    const socket = io()
    setSocket(socket)
    return () => {
      socket.close()
    }
  }, [])

  useEffect(() => {
    if (!socket) return
    const cb: SocketEvents['oscIn'] = (route, data) => {}
    socket.on('oscIn', cb)
    return () => {
      socket.off('oscIn', cb)
    }
  }, [socket])
  return (
    <SocketProvider socket={socket}>
      <Scene />
    </SocketProvider>
  )
}

export default App
