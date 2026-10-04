import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'

// ─── Connected User Tracking ─────────────────────────────────────────────────
interface ConnectedUser {
  socketId: string
  userId: string
  role: string
  connectedAt: Date
}

const connectedUsers = new Map<string, ConnectedUser>() // socketId -> user info

// ─── Room helpers ────────────────────────────────────────────────────────────
function userRoom(userId: string): string {
  return `user:${userId}`
}

function roleRoom(role: string): string {
  return `role:${role}`
}

const ADMIN_ROOM = 'role:admin'

// ─── HTTP Helpers ────────────────────────────────────────────────────────────
function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8')
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

// ─── HTTP Server with custom request interception ────────────────────────────
// We need to handle custom HTTP endpoints (POST /emit, POST /broadcast, GET /health)
// alongside Socket.IO. Since Socket.IO with path:'/' captures all requests via
// Engine.IO, we intercept requests by wrapping the server's emit method.
const httpServer = createServer()

// ─── Socket.IO Server ────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ─── Intercept HTTP requests before Engine.IO processes them ─────────────────
// Engine.IO wraps the server's request listeners when path:'/', capturing ALL
// requests. We wrap httpServer.emit('request') to intercept custom routes first.
const originalEmit = httpServer.emit.bind(httpServer)
const handledRoutes = new Set<string>()

httpServer.emit = function (event: string, ...args: unknown[]) {
  if (event === 'request') {
    const req = args[0] as IncomingMessage
    const res = args[1] as ServerResponse

    // Check if this is one of our custom HTTP routes
    if (
      (req.method === 'POST' && (req.url === '/emit' || req.url === '/broadcast')) ||
      (req.method === 'GET' && req.url === '/health')
    ) {
      handleCustomRoute(req, res)
      return false // Don't propagate to Engine.IO listeners
    }
  }

  return originalEmit(event, ...args)
}

// ─── Custom HTTP Route Handler ───────────────────────────────────────────────
function handleCustomRoute(req: IncomingMessage, res: ServerResponse) {
  function sendJSON(statusCode: number, data: Record<string, unknown>) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  // POST /emit – emit an event to a specific user room
  if (req.method === 'POST' && req.url === '/emit') {
    parseBody(req)
      .then((payload) => {
        const { userId, event, data } = payload as {
          userId?: string
          event?: string
          data?: Record<string, unknown>
        }

        if (!userId || !event) {
          sendJSON(400, { error: 'Missing userId or event' })
          return
        }

        io.to(userRoom(userId)).emit(event, data || {})
        console.log(`[Realtime] HTTP /emit -> ${userRoom(userId)} event=${event}`)
        sendJSON(200, { ok: true, room: userRoom(userId), event })
      })
      .catch(() => {
        sendJSON(400, { error: 'Invalid JSON body' })
      })
    return
  }

  // POST /broadcast – broadcast an event to all connected clients
  if (req.method === 'POST' && req.url === '/broadcast') {
    parseBody(req)
      .then((payload) => {
        const { event, data } = payload as {
          event?: string
          data?: Record<string, unknown>
        }

        if (!event) {
          sendJSON(400, { error: 'Missing event' })
          return
        }

        io.emit(event, data || {})
        console.log(`[Realtime] HTTP /broadcast event=${event}`)
        sendJSON(200, { ok: true, event })
      })
      .catch(() => {
        sendJSON(400, { error: 'Invalid JSON body' })
      })
    return
  }

  // GET /health – simple health check
  if (req.method === 'GET' && req.url === '/health') {
    sendJSON(200, {
      status: 'ok',
      connections: connectedUsers.size,
      uptime: process.uptime(),
    })
    return
  }
}

// ─── Socket.IO Connection Handler ────────────────────────────────────────────
io.on('connection', (socket: Socket) => {
  console.log(`[Realtime] Client connected: ${socket.id}`)

  // ─── join ──────────────────────────────────────────────────────────────────
  // User connects with { userId, role }, joins user-specific room and role room
  socket.on('join', (data: { userId: string; role: string }) => {
    const { userId, role } = data

    if (!userId || !role) {
      console.warn(`[Realtime] Invalid join data from ${socket.id}:`, data)
      return
    }

    // Track the user
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId,
      role,
      connectedAt: new Date(),
    })

    // Join user-specific room
    socket.join(userRoom(userId))

    // Join role room
    socket.join(roleRoom(role))

    // If admin, also join the admin room
    if (role === 'admin') {
      socket.join(ADMIN_ROOM)
    }

    console.log(
      `[Realtime] User ${userId} (role: ${role}) joined rooms: ${userRoom(userId)}, ${roleRoom(role)}${role === 'admin' ? `, ${ADMIN_ROOM}` : ''}`
    )
  })

  // ─── ping ──────────────────────────────────────────────────────────────────
  // Latency measurement – client sends ping and we acknowledge with callback
  socket.on('ping', (callback: () => void) => {
    if (typeof callback === 'function') {
      callback()
    }
  })

  // ─── notification:new ─────────────────────────────────────────────────────
  // Broadcast notification to a user room
  socket.on('notification:new', (data: { userId: string; notification: Record<string, unknown> }) => {
    if (!data?.userId) return
    io.to(userRoom(data.userId)).emit('notification:new', data.notification)
    console.log(`[Realtime] notification:new -> ${userRoom(data.userId)}`)
  })

  // ─── leave:status-changed ─────────────────────────────────────────────────
  // Broadcast leave status change to user room and manager room
  socket.on(
    'leave:status-changed',
    (data: { userId: string; leaveId: string; status: string; comment?: string }) => {
      if (!data?.userId) return
      const payload = { leaveId: data.leaveId, status: data.status, comment: data.comment }
      io.to(userRoom(data.userId)).emit('leave:status-changed', payload)
      io.to(roleRoom('manager')).emit('leave:status-changed', payload)
      io.to(ADMIN_ROOM).emit('leave:status-changed', payload)
      console.log(
        `[Realtime] leave:status-changed -> ${userRoom(data.userId)}, ${roleRoom('manager')}, ${ADMIN_ROOM}`
      )
    }
  )

  // ─── request:status-changed ───────────────────────────────────────────────
  // Broadcast request status change to user room and manager room
  socket.on(
    'request:status-changed',
    (data: { userId: string; requestId: string; status: string; comment?: string }) => {
      if (!data?.userId) return
      const payload = { requestId: data.requestId, status: data.status, comment: data.comment }
      io.to(userRoom(data.userId)).emit('request:status-changed', payload)
      io.to(roleRoom('manager')).emit('request:status-changed', payload)
      io.to(ADMIN_ROOM).emit('request:status-changed', payload)
      console.log(
        `[Realtime] request:status-changed -> ${userRoom(data.userId)}, ${roleRoom('manager')}, ${ADMIN_ROOM}`
      )
    }
  )

  // ─── complaint:status-changed ─────────────────────────────────────────────
  // Broadcast complaint status change to user room and manager room
  socket.on(
    'complaint:status-changed',
    (data: { userId: string; complaintId: string; status: string; resolution?: string }) => {
      if (!data?.userId) return
      const payload = { complaintId: data.complaintId, status: data.status, resolution: data.resolution }
      io.to(userRoom(data.userId)).emit('complaint:status-changed', payload)
      io.to(roleRoom('manager')).emit('complaint:status-changed', payload)
      io.to(ADMIN_ROOM).emit('complaint:status-changed', payload)
      console.log(
        `[Realtime] complaint:status-changed -> ${userRoom(data.userId)}, ${roleRoom('manager')}, ${ADMIN_ROOM}`
      )
    }
  )

  // ─── task:assigned ─────────────────────────────────────────────────────────
  // Broadcast task assignment to user room
  socket.on(
    'task:assigned',
    (data: { userId: string; taskId: string; assigneeId: string; assigneeName: string }) => {
      if (!data?.userId) return
      const payload = { taskId: data.taskId, assigneeId: data.assigneeId, assigneeName: data.assigneeName }
      io.to(userRoom(data.userId)).emit('task:assigned', payload)
      console.log(`[Realtime] task:assigned -> ${userRoom(data.userId)}`)
    }
  )

  // ─── task:status-changed ──────────────────────────────────────────────────
  // Broadcast task status change to relevant user rooms
  socket.on(
    'task:status-changed',
    (data: { userId: string; taskId: string; status: string }) => {
      if (!data?.userId) return
      const payload = { taskId: data.taskId, status: data.status }
      io.to(userRoom(data.userId)).emit('task:status-changed', payload)
      io.to(roleRoom('manager')).emit('task:status-changed', payload)
      console.log(`[Realtime] task:status-changed -> ${userRoom(data.userId)}, ${roleRoom('manager')}`)
    }
  )

  // ─── attendance:clock-in ──────────────────────────────────────────────────
  // Broadcast attendance events to user room and manager room
  socket.on(
    'attendance:clock-in',
    (data: { userId: string }) => {
      if (!data?.userId) return
      io.to(userRoom(data.userId)).emit('attendance:clock-in', { userId: data.userId })
      io.to(roleRoom('manager')).emit('attendance:clock-in', { userId: data.userId })
      io.to(ADMIN_ROOM).emit('attendance:clock-in', { userId: data.userId })
      console.log(`[Realtime] attendance:clock-in -> ${userRoom(data.userId)}, ${roleRoom('manager')}, ${ADMIN_ROOM}`)
    }
  )

  // ─── payroll:status-changed ───────────────────────────────────────────────
  // Broadcast payroll status change to user room
  socket.on(
    'payroll:status-changed',
    (data: { userId: string; payrollId: string; status: string }) => {
      if (!data?.userId) return
      const payload = { payrollId: data.payrollId, status: data.status }
      io.to(userRoom(data.userId)).emit('payroll:status-changed', payload)
      io.to(roleRoom('manager')).emit('payroll:status-changed', payload)
      io.to(ADMIN_ROOM).emit('payroll:status-changed', payload)
      console.log(
        `[Realtime] payroll:status-changed -> ${userRoom(data.userId)}, ${roleRoom('manager')}, ${ADMIN_ROOM}`
      )
    }
  )

  // ─── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason: string) => {
    const user = connectedUsers.get(socket.id)
    if (user) {
      connectedUsers.delete(socket.id)
      console.log(
        `[Realtime] User ${user.userId} (role: ${user.role}) disconnected: ${reason}. Online: ${connectedUsers.size}`
      )
    } else {
      console.log(`[Realtime] Client disconnected: ${socket.id} (reason: ${reason})`)
    }
  })

  // ─── error ─────────────────────────────────────────────────────────────────
  socket.on('error', (error: Error) => {
    console.error(`[Realtime] Socket error (${socket.id}):`, error)
  })
})

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = 3003

httpServer.listen(PORT, () => {
  console.log(`[Realtime] EMS Real-time service running on port ${PORT}`)
  console.log(`[Realtime] Socket.IO path: /`)
  console.log(`[Realtime] HTTP endpoints: POST /emit, POST /broadcast, GET /health`)
})

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
function gracefulShutdown(signal: string) {
  console.log(`[Realtime] Received ${signal}, shutting down gracefully...`)

  // Close all Socket.IO connections
  io.disconnectSockets(true)

  // Close the HTTP server
  httpServer.close(() => {
    console.log('[Realtime] Server closed')
    process.exit(0)
  })

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('[Realtime] Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
