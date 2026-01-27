"""
WebSocket API Endpoint
Real-time communication endpoint for authenticated users
"""
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.core.security import decode_token
from app.models.user import User
from app.websocket.connection_manager import connection_manager
from app.websocket.events import WebSocketEvent, build_pong_event, build_error_event

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


async def get_current_user_ws(
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Authenticate WebSocket connection via query parameter token"""
    if not token:
        print("[WS AUTH] No token provided", flush=True)
        return None
        
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            print(f"[WS AUTH] No sub in token. Payload: {payload}", flush=True)
            return None
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            print(f"[WS AUTH] User not found in DB: {user_id}", flush=True)
        else:
            print(f"[WS AUTH] Authenticated user: {user.username} ({user_id})", flush=True)
        return user
    except Exception as e:
        print(f"[WS AUTH] Exception during authentication: {str(e)}", flush=True)
        logger.error(f"WebSocket authentication failed: {e}")
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    print(f"[WS] New connection attempt with token: {token[:15]}...", flush=True)
    # Authenticate user
    user = await get_current_user_ws(token, db)
    if not user:
        print("[WS] Authentication failed, closing connection with 1008", flush=True)
        await websocket.close(code=1008, reason="Authentication required")
        return
        
    user_id = str(user.id)
    print(f"[WS] Accepting connection for user: {user.username}", flush=True)
    
    # Accept connection
    await connection_manager.connect(websocket, user_id)
    print(f"[WS] Connection accepted for user: {user.username}", flush=True)
    
    try:
        # Send welcome message
        await websocket.send_json({
            "event": "connected",
            "data": {
                "user_id": user_id,
                "username": user.username,
                "message": "WebSocket connected successfully"
            }
        })
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            event_type = data.get("event")
            
            if event_type == WebSocketEvent.PING:
                # Respond to ping with pong
                await websocket.send_json(build_pong_event())
                
            elif event_type == "subscribe":
                # Client wants to subscribe to specific events
                # (Future enhancement: topic-based subscriptions)
                logger.info(f"User {user_id} subscribed to: {data.get('topics', [])}")
                
            elif event_type == "unsubscribe":
                # Client wants to unsubscribe from specific events
                logger.info(f"User {user_id} unsubscribed from: {data.get('topics', [])}")
                
            else:
                # Unknown event type
                await websocket.send_json(
                    build_error_event(f"Unknown event type: {event_type}")
                )
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected normally: user_id={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        await connection_manager.disconnect(websocket)
