# Local development

Run the local services from the repository root:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
npm run db:migrate
npm exec nx -- serve agent-runtime
npm exec nx -- serve mcp-gateway
npm exec nx -- serve api
npm exec nx -- serve web
```

`.env` is local-only and must not be committed. Bedrock uses the ambient AWS credential chain; do not place AWS credentials in `.env`. Select a model identifier that is available in the configured AWS Region before starting an AgentCore or Bedrock-backed workflow.
