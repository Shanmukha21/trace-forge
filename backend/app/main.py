import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from runtime.coordinator import run_program

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("traceforge.backend")

app = FastAPI(
    title="TraceForge API",
    description="Local-first Program Execution Observability Platform backend",
    version="0.1.0",
)

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production or keep local-first open
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    """Verify that backend server is running and healthy."""
    return {"status": "ok", "service": "traceforge-backend"}


@app.websocket("/api/v1/execute")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """WebSocket endpoint to run source code and stream execution trace events."""
    await websocket.accept()
    logger.info("WebSocket connection accepted.")
    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"Received data: {data}")
            action = data.get("action")

            if action == "RUN":
                code = data.get("code", "")
                stdin = data.get("stdin", "")
                logger.info(
                    "Requested execution (code len=%d, stdin len=%d)",
                    len(code),
                    len(stdin),
                )

                # Stream execution trace events
                for event in run_program(code, stdin):
                    # Pydantic v2 model_dump returns serialized dict
                    await websocket.send_json(event.model_dump())
            else:
                await websocket.send_json({"error": "Unknown action"})
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected.")
    except Exception as e:
        logger.error(f"WebSocket execution error: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except RuntimeError:
            pass  # Connection might already be closed
