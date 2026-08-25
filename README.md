# ResolveX

Autonomous customer resolution engine for action-heavy support workflows.

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

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both API and web dev servers |
| `npm run dev:api` | Start API server only |
| `npm run dev:web` | Start web dev server only |
| `npm run build` | Build all packages |
| `npm run db:push` | Push schema changes to database |
| `npm run db:generate` | Generate migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all packages |

## Tech Stack

- **Language**: TypeScript 5.x (strict mode)
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, TanStack Query 5
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

## Environment Variables

See `.env.example` files in each app for required variables.

## License

MIT