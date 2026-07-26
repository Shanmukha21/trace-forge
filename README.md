# TraceForge

TraceForge is a local-first Program Execution Observability Platform. It parses, instruments, executes, and traces Python code in real-time, converting execution paths into immutable event streams that power dynamic visualizations.

## Folder Structure

- `backend/`: FastAPI Web Server & Execution Coordinator.
- `frontend/`: React + TypeScript + Vite + Monaco Editor frontend application.
- `runtime/`: Core engine for code instrumentation, parsing, and execution tracing.
- `shared/`: Shared models and JSON/Pydantic schemas.
- `database/`: Local PostgreSQL schema and configurations.
- `tests/`: Unit and integration tests.
- `docs/`: Design and architectural documentation.

## Running Locally

To run the complete platform locally using Docker Compose:

```bash
docker compose up --build
```

- Frontend: [http://localhost:5174](http://localhost:5174)
- Backend: [http://localhost:8001](http://localhost:8001)
- Swagger API Docs: [http://localhost:8001/docs](http://localhost:8001/docs)
