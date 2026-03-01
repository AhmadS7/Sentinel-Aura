package api

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for demo
	},
}

type WSHub struct {
	clients map[*websocket.Conn]bool
	mu      sync.Mutex
}

func NewWSHub() *WSHub {
	return &WSHub{
		clients: make(map[*websocket.Conn]bool),
	}
}

// WebsocketHandler handles new connections
func (hub *WSHub) WebsocketHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("WS Upgrade error:", err)
		return
	}

	hub.mu.Lock()
	hub.clients[conn] = true
	hub.mu.Unlock()

	log.Println("New WebSocket client connected")

	// Keep connection alive, listen for close
	go func() {
		defer func() {
			hub.mu.Lock()
			delete(hub.clients, conn)
			hub.mu.Unlock()
			conn.Close()
			log.Println("WebSocket client disconnected")
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}

// Broadcast sends a JSON message to all connected clients
func (hub *WSHub) Broadcast(messageType string, payload interface{}) {
	hub.mu.Lock()
	defer hub.mu.Unlock()

	msg := map[string]interface{}{
		"type":      messageType,
		"timestamp": time.Now().UnixMilli(),
		"payload":   payload,
	}

	for conn := range hub.clients {
		if err := conn.WriteJSON(msg); err != nil {
			log.Println("WS Write error:", err)
			conn.Close()
			delete(hub.clients, conn)
		}
	}
}
