from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..core import ApiError, manager, principal_from_ws_token

router = APIRouter()


@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    project_id = websocket.query_params.get("project_id")
    run_id = websocket.query_params.get("run_id")
    try:
        principal_from_ws_token(token)
    except ApiError:
        await websocket.close(code=1008)
        return
    await manager.connect(websocket, project_id, run_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
