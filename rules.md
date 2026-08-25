# ResolveX Engineering Rules

## What we use
- TypeScript with strict mode.
- React + Vite.
- Fastify.
- PostgreSQL + pgvector.
- Zod at external boundaries.
- Freshworks Agent Studio.
- Freshworks AI Actions/MCP.
- ElevenLabs Agents.
- Deterministic authorization and post-action verification.
- Vitest and Playwright.
- Vercel.
- Structured logs and persistent agent traces.

## What we avoid
- LLM-only authorization.
- Privileged browser-side API calls.
- Tool execution without schema validation.
- Mutations without verification.
- Hidden actions without trace records.
- Unnecessary multi-agent hierarchies.
- New frameworks during the 24-hour build.
- Major dependency upgrades during the final build.
- Secrets in source code.
- Production payment processing.
- RAG as an authorization mechanism.
- Retrieved content overriding system permissions.

## Libraries
- React 19.x
- React DOM 19.x
- TypeScript 5.x
- Vite 7.x
- Tailwind CSS 4.x
- Fastify 5.x
- Zod 4.x
- Drizzle ORM 0.x
- pg 8.x
- TanStack Query 5.x
- Vitest 3.x
- Playwright 1.x
- Lucide React 0.x

The repository lockfile is authoritative.

## Error handling rules
- Catch agent failures at orchestration boundaries.
- Record agent, stage, error class, and correlation ID.
- Never expose stack traces to customers.
- Validate every tool input.
- Retry only idempotent operations.
- Never blindly retry a mutation.
- If mutation outcome is unknown, verify before retrying.
- If no policy evidence exists for a sensitive action, do not execute it.
- Show concise recovery status in the UI.
- Preserve conversation and trace state.

## Boundaries of AI

### AI may decide
- Intent classification.
- Task decomposition.
- Specialist routing.
- Relevant knowledge selection.
- Selection of approved low-risk tools.
- Customer-facing summaries.
- Whether a case appears to require escalation, subject to deterministic rules.

### AI may not decide alone
- High-risk mutation authorization.
- Refunds above the autonomous threshold.
- Account deletion.
- Sensitive identity/security changes.
- Policy exceptions.
- Whether an uncertain mutation succeeded.
- Changes to system permissions.

### Human review required
- High-value refunds.
- Policy exceptions.
- Ambiguous identity.
- Conflicting account state.
- Unverified mutations.
- Unsupported workflows.

### AI must not touch without explicit approval
- Production secrets.
- Deployment credentials.
- Destructive database migrations.
- Payment-provider configuration.
- Authentication-provider configuration.
- Production CI/CD credentials.
- Unrelated Freshworks production settings.
