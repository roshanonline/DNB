/**
 * WebSocket Service for Real-Time Notifications
 */

class WebSocketService {
  constructor() {
    this.socket = null
    this.listeners = []
  }

  connect(userId) {
    const token = localStorage.getItem('access_token')
    
    if (!token) {
      console.error('No auth token found')
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/notifications/?token=${token}`
    
    this.socket = new WebSocket(wsUrl)

    this.socket.onopen = () => {
      console.log('WebSocket connected')
    }

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.notifyListeners(data)
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.socket.onclose = () => {
      console.log('WebSocket disconnected')
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (localStorage.getItem('access_token')) {
          this.connect(userId)
        }
      }, 3000)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  addListener(callback) {
    this.listeners.push(callback)
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback)
  }

  notifyListeners(data) {
    this.listeners.forEach(listener => listener(data))
  }

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }
}

const wsService = new WebSocketService()
export default wsService
