"""
WebSocket Connection Manager for Real-Time Updates
Manages WebSocket connections and broadcasts messages to connected clients
"""
import logging
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # Map of user_id -> list of WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Map of connection -> user_id for quick lookup
        self.connection_users: Dict[WebSocket, str] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
            
        self.active_connections[user_id].append(websocket)
        self.connection_users[websocket] = user_id
        
        logger.info(f"WebSocket connected: user_id={user_id}, total_connections={len(self.active_connections[user_id])}")
        
    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        user_id = self.connection_users.get(websocket)
        if not user_id:
            return
            
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                
        del self.connection_users[websocket]
        logger.info(f"WebSocket disconnected: user_id={user_id}")
        
    async def send_personal_message(self, message: dict, user_id: str):
        """Send a message to all connections of a specific user"""
        if user_id not in self.active_connections:
            logger.debug(f"No active connections for user: {user_id}")
            return
            
        disconnected = []
        for connection in self.active_connections[user_id]:
            try:
                await connection.send_json(message)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                disconnected.append(connection)
                
        # Clean up disconnected connections
        for connection in disconnected:
            await self.disconnect(connection)
            
    async def broadcast_to_creator(self, message: dict, creator_id: str):
        """Broadcast to all connections of a creator (alias for send_personal_message)"""
        await self.send_personal_message(message, creator_id)
        
    async def broadcast_to_multiple_users(self, message: dict, user_ids: List[str]):
        """Send a message to multiple users"""
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)
            
    def get_connection_count(self, user_id: str) -> int:
        """Get the number of active connections for a user"""
        return len(self.active_connections.get(user_id, []))
        
    def is_user_online(self, user_id: str) -> bool:
        """Check if a user has any active connections"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0


# Global instance
connection_manager = ConnectionManager()
