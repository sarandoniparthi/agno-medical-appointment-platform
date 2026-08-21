# Local development

Use Node.js 22.12.x (the repository pins `22.12.0` in `.nvmrc` and npm enforces
`>=22.12.0 <23`), npm, uv, and Docker Compose. From the repository root, create
the single local configuration file before starting any target:

```powershell
Copy-Item .env.example .env
npm install
```

All local targets load this root `.env` with the same cross-platform contract:

| Variable | Local example | Consumer |
| --- | --- | --- |
| `API_PORT` | `3000` | Nest API HTTP server |
| `WEB_PORT` | `4200` | Vite development and preview servers |
| `AGENT_HTTP_PORT` | `8000` | Agent runtime FastAPI server |
| `AGENT_GRPC_PORT` | `50051` | Agent runtime Python gRPC server |
| `AGENT_GRPC_URL` | `127.0.0.1:50051` | Nest API gRPC client |
| `MCP_GATEWAY_PORT` | `8010` | MCP gateway FastAPI server |

`POSTGRES_HOST_PORT=55432` avoids the commonly occupied host port 5432. The
host port in `DATABASE_URL` must match it, so the example URL also uses 55432;
the container still listens on 5432. If either value changes, update both.
`POSTGRES_PASSWORD` and `DATABASE_URL` are required: Compose, Nest, and the
TypeORM CLI fail closed when they are absent rather than selecting embedded
credentials.

Start the services:

```powershell
docker compose up -d postgres
npm run db:migrate
npm exec nx -- serve agent-runtime
npm exec nx -- serve mcp-gateway
npm exec nx -- serve api
npm exec nx -- serve web
```

Run each long-running `serve` command in a separate terminal. The normal agent
runtime target starts FastAPI and gRPC together and coordinates their shutdown.
Keep `AGENT_GRPC_URL` aligned with `AGENT_GRPC_PORT` when overriding either one.

`.env` is local-only and must not be committed. Bedrock uses the ambient AWS
credential chain; do not place AWS credentials in `.env`. Select a model
identifier available in the configured AWS Region before starting an AgentCore
or Bedrock-backed workflow.
