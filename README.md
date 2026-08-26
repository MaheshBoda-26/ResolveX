# ResolveX

Autonomous customer resolution engine for action-heavy support workflows.

## Demo

**Target Scenario**: "I was charged twice and want to upgrade my plan"
- Triage detects: Billing (duplicate charge) + Subscription (upgrade)
- Billing Agent: Detects duplicate charge → Auto-refund if <$50
- Subscription Agent: Checks eligibility → Auto-upgrade
- Autonomy Gate: Deterministic rules control autonomous actions
- Verification: Post-action state confirmation
- Handoff: Escalation with full case brief for high-value/policy exceptions

## Structure

```
resolvex/
├── apps/
│   ├── api/          # Fastify backend with Drizzle ORM
│   └── web/          # React 19 + Vite 7 + Tailwind 4 frontend
└── packages/
    └── shared/       # Shared types, Zod schemas, constants
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ with pgvector extension
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start PostgreSQL and run migrations
npm run db:push
npm run db:seed

# Start development servers
npm run dev
```

### Demo Data

The seed script creates:
- 2 customers (John Doe - basic, Jane Smith - pro)
- 3 transactions (including duplicate charge for John)
- 2 active subscriptions
- 3 knowledge documents (Refund Policy, Upgrade Policy, Plan Comparison)

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both API and web dev servers |
| `npm run dev:api` | Start API server only (port 3001) |
| `npm run dev:web` | Start web dev server only (port 5173) |
| `npm run build` | Build all packages |
| `npm run db:push` | Push schema changes to database |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all packages |
| `npm run eval:autonomy` | Run autonomy gate evaluation |

## Tech Stack

- **Language**: TypeScript 5.x (strict mode)
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, TanStack Query 5, shadcn/ui
- **Backend**: Fastify 5, Drizzle ORM, PostgreSQL + pgvector
- **Validation**: Zod 4.x at all external boundaries
- **Testing**: Vitest 3.x, Playwright 1.x
- **Deployment**: Vercel

## Architecture

### Shared Package (`@resolvex/shared`)

Single source of truth for:
- TypeScript interfaces (`src/types`)
- Zod validation schemas (`src/schemas`)
- Constants and enums (`src/constants`)

### API (`@resolvex/api`)

- REST API with WebSocket support
- Agent orchestration (Triage, Billing, Subscription)
- Freshworks Agent Studio integration
- ElevenLabs voice integration
- Policy RAG with pgvector
- Deterministic autonomy gates
- Post-action verification

### Web (`@resolvex/web`)

- Judge-facing chat/voice interface
- Real-time agent trace visualization
- Structured handoff display
- Evaluation dashboard

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id` | Get conversation |
| POST | `/api/conversations/:id/messages` | Add message |
| POST | `/api/triage` | Triage message → intents + tasks |
| POST | `/api/agent/process` | Full workflow (triage → specialists → verify) |
| GET | `/api/traces/:runId` | Get agent run trace with details |
| GET | `/api/conversations/:id/trace` | Get conversation traces |
| GET | `/api/handoffs` | List pending handoffs |
| GET | `/api/handoffs/:id` | Get handoff case brief |
| PATCH | `/api/handoffs/:id/accept` | Accept handoff |
| PATCH | `/api/handoffs/:id/complete` | Complete handoff |
| POST | `/api/admin/seed-reset` | Reset demo data |

## Development

### Adding Shared Types

1. Add types to `packages/shared/src/types/index.ts`
2. Add Zod schemas to `packages/shared/src/schemas/index.ts`
3. Export from `packages/shared/src/index.ts`
4. Run `npm run build` in shared package

### Database Changes

1. Modify `apps/api/src/db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:migrate` to apply

## Evaluation

Run the autonomy gate evaluation suite:
```bash
npm run eval:autonomy
```

Target: 90%+ accuracy | Current: 100% (33/33 test cases)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Configure environment variables
4. Deploy

### Environment Variables (Production)

**API** (`apps/api/.env`):
```
DATABASE_URL=postgresql://...
FRESHWORKS_DOMAIN=...
FRESHWORKS_API_KEY=...
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
NODE_ENV=production
```

**Web** (`apps/web/.env`):
```
VITE_API_URL=https://your-api.vercel.app
```

## Demo Flow

1. Open `/chat`
2. Send: "I was charged twice and want to upgrade my plan"
3. Watch triage → billing + subscription tasks
4. View trace at `/trace?runId=...`
5. High-value refund ($600) → triggers handoff at `/handoffs`

## License

MIT