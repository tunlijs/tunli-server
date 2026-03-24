import {randomUUID} from 'crypto'
import type {Server, Socket} from 'socket.io'
import {config} from '#lib/Config'
import {socketLogger} from '#bootstrap'
import jwt from 'jsonwebtoken'

const shareHosts = new Map<string, Socket>()                        // publicKey → socket
const sessions = new Map<string, {host: Socket; client: Socket}>()  // sessionId → session

export const attachShareNamespace = (io: Server): void => {
  const share = io.of('/share')

  share.use((socket, next) => {
    if (!socket.handshake.auth?.token) {
      return next(new Error('Authentication error'))
    }
    jwt.verify(socket.handshake.auth.token, config.auth.jwtSignatureSecret, (err: Error | null) => {
      next(err ? new Error('Authentication error') : undefined)
    })
  })

  share.on('connection', (socket) => {

    socket.on('share-register', ({publicKey}: {publicKey: string}) => {
      if (shareHosts.has(publicKey)) {
        socket.emit('share-error', {message: 'Public key already registered'})
        return
      }
      shareHosts.set(publicKey, socket)
      socket.emit('share-registered')
      socketLogger.info(`share registered: ${publicKey.slice(0, 16)}…`)

      socket.on('disconnect', () => {
        shareHosts.delete(publicKey)
        for (const [sessionId, session] of sessions) {
          if (session.host === socket) {
            session.client.emit('share-end')
            sessions.delete(sessionId)
          }
        }
      })
    })

    socket.on('share-connect', ({targetPublicKey, publicKey}: {targetPublicKey: string; publicKey: string}) => {
      const hostSocket = shareHosts.get(targetPublicKey)
      if (!hostSocket) {
        socket.emit('share-error', {message: 'No active share for that public key'})
        return
      }

      const sessionId = randomUUID()
      sessions.set(sessionId, {host: hostSocket, client: socket})

      hostSocket.emit('share-client', {sessionId, publicKey})
      socket.emit('share-connected', {sessionId})

      const onClientDisconnect = () => {
        if (!sessions.has(sessionId)) return
        sessions.delete(sessionId)
        hostSocket.emit('share-end', {sessionId})
      }
      socket.on('disconnect', onClientDisconnect)
    })

    socket.on('share-session-start', ({sessionId}: {sessionId: string}) => {
      const session = sessions.get(sessionId)
      if (!session) return
      session.host.emit('share-session-start', {sessionId})
    })

    socket.on('share-data', ({sessionId, data}: {sessionId: string; data: Buffer}) => {
      const session = sessions.get(sessionId)
      if (!session) return
      if (session.host === socket) {
        session.client.emit('share-data', {data})
      } else {
        session.host.emit('share-data', {sessionId, data})
      }
    })

    socket.on('share-end', ({sessionId}: {sessionId: string}) => {
      const session = sessions.get(sessionId)
      if (!session) return
      sessions.delete(sessionId)
      if (session.host === socket) {
        session.client.emit('share-end')
      } else {
        session.host.emit('share-end', {sessionId})
      }
    })
  })
}
