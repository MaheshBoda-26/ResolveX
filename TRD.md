# ResolveX Technical Requirements Document

## Tech stack

| Area | Choice | Purpose |
|---|---|---|
| Language | TypeScript | Shared frontend/backend types |
| Frontend | React + Vite | Judge-facing web application |
| Styling | Tailwind CSS | UI styling |
| Components | shadcn/ui | Accessible UI primitives |
| Backend | Node.js + Fastify | API and orchestration |
| Database | PostgreSQL | Durable application state |
| Retrieval | pgvector | Policy retrieval |
| Hosting | Vercel | Hosted demo |
| Voice | ElevenLabs Agents | Voice interaction |
| Agent platform | Freshworks Agent Studio | Track 1 agent workflow |
| Enterprise actions | Freshworks AI Actions / MCP | Tool execution |
| Testing | Vitest + Playwright | Unit/integration/E2E |

## Libraries and packages

Pin resolved versions in the repository lockfile. Target major versions:

- `react` 19.x, UI.
- `react-dom` 19.x, browser rendering.
- `typescript` 5.x, static typing.
- `vite` 7.x, frontend build.
- `tailwindcss` 4.x, styling.
- `fastify` 5.x, backend API.
- `zod` 4.x, runtime validation.
- `pg` 8.x, PostgreSQL client.
- `drizzle-orm` 0.x, typed database access.
- `@tanstack/react-query` 5.x, server state.
- `lucide-react` 0.x, icons.
- `vitest` 3.x, unit/integration tests.
- `playwright` 1.x, E2E tests.
- `dotenv` 16.x, local environment configuration.

## APIs and third-party integrations

### Freshworks
Use Freshworks Agent Studio for the agent workflow. Use Freshworks AI Actions and/or MCP-connected tools for approved operations such as:
- `get_customer`
- `get_transactions`
- `get_subscription`
- `check_policy`
- `issue_refund`
- `upgrade_subscription`
- `verify_customer_state`

Exact action/MCP schemas must match the connected environment.

### ElevenLabs
Use ElevenLabs Agents for customer voice interaction. Voice should enter the same resolution workflow used by chat.

### PostgreSQL / pgvector
Use PostgreSQL for operational data and pgvector for policy embeddings.

## Data models and schema

### customers
`id UUID PK`, `name text`, `email text`, `plan_id text`, `status text`, `created_at timestamp`, `updated_at timestamp`.

### transactions
`id UUID PK`, `customer_id UUID FK`, `invoice_id text`, `amount numeric`, `currency text`, `status text`, `charged_at timestamp`, `metadata JSONB`.

### subscriptions
`id UUID PK`, `customer_id UUID FK`, `plan_id text`, `status text`, `price numeric`, `renewal_at timestamp`, `updated_at timestamp`.

### knowledge_documents
`id UUID PK`, `title text`, `source text`, `content text`, `metadata JSONB`, `embedding vector`, `created_at timestamp`.

### conversations
`id UUID PK`, `customer_id UUID nullable FK`, `channel text`, `status text`, `created_at timestamp`, `updated_at timestamp`.

### agent_runs
`id UUID PK`, `conversation_id UUID FK`, `agent_name text`, `input JSONB`, `decision JSONB`, `status text`, `started_at timestamp`, `completed_at timestamp`.

### tool_calls
`id UUID PK`, `agent_run_id UUID FK`, `tool_name text`, `arguments JSONB`, `result JSONB`, `status text`, `latency_ms integer`, `created_at timestamp`.

### verifications
`id UUID PK`, `conversation_id UUID FK`, `action_type text`, `expected_state JSONB`, `observed_state JSONB`, `status text`, `created_at timestamp`.

### handoffs
`id UUID PK`, `conversation_id UUID FK`, `reason text`, `evidence JSONB`, `recommended_action text`, `status text`, `created_at timestamp`.

### evaluations
`id UUID PK`, `case_id text`, `input JSONB`, `expected_outcome JSONB`, `actual_outcome JSONB`, `status text`, `created_at timestamp`.

## Authentication and authorization approach
- Demo customers use seeded account/session identity.
- Operator/trace views use authenticated access or deployment-level protection.
- Agent actions use server-side authorization rules.
- Read-only actions are low risk.
- Low-risk mutations require policy and evidence.
- High-risk mutations require human approval.
- Ambiguous or unsupported requests escalate.
- Model output never serves as the sole authorization decision.

## Performance requirements
- Initial app load target: under 2.5 seconds on normal broadband.
- Core API target: under 500 ms p95 excluding third-party agent/tool latency.
- Support at least 10 concurrent demo/test sessions.
- Record tool latency and failures.
- Voice latency is optimized through ElevenLabs configuration but depends on third-party services.

## Security requirements
- Keep secrets in environment variables.
- Never expose Freshworks or ElevenLabs credentials in the browser.
- Validate external inputs with Zod.
- Enforce action permissions server-side.
- Use synthetic customer/payment data.
- Treat retrieved documents as untrusted input.
- Do not allow retrieved text to override authorization rules.
- Verify every state-changing action.
- Escalate high-risk, ambiguous, policy-exception, or unverifiable cases.

## Deployment and environment setup
### Development
Local React/Vite, Fastify, PostgreSQL, `.env.local`, and seed data.

### Staging/demo
Vercel deployment, hosted PostgreSQL, production-like environment variables, seeded demo data, and smoke tests.

### Production direction
Future production deployment adds managed secrets, stronger identity, rate limiting, monitoring, backups, audit retention, and enterprise access controls.

## Testing approach
### Unit
Test schemas, autonomy decisions, permissions, policy matching, tool validation, verification, and handoff generation.

### Integration
Test agent-to-RAG, agent-to-Freshworks, action-to-verification, failure-to-escalation, and multi-agent context propagation.

### E2E
Test duplicate charge + upgrade, high-value refund handoff, tool failure, missing information, and policy exception.
