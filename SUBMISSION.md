# ResolveX - Stage 1 Submission

## Project Description

**ResolveX** is an autonomous customer resolution engine designed for action-heavy support workflows. It demonstrates end-to-end autonomous resolution for a focused support scenario: duplicate charge detection + plan upgrade.

### Core Capability

Given a customer request like *"I was charged twice and want to upgrade my plan"*, ResolveX:

1. **Triage** - Detects dual intents (billing + subscription) and creates structured tasks
2. **Specialist Agents** - Routes to Billing Agent (duplicate charge investigation) and Subscription Agent (upgrade eligibility)
3. **Policy RAG** - Grounds decisions in company policies via pgvector similarity search
4. **Autonomy Gate** - Deterministic rules evaluate risk + evidence + permission + policy before any mutation
5. **Action Execution** - Calls Freshworks MCP tools for refunds/upgrades with Zod-validated inputs
6. **Verification** - Confirms post-action state matches expected outcome
7. **Escalation** - Creates structured handoff with full case brief when autonomy threshold exceeded

### Safety Guarantees

- **0 unauthorized high-risk actions**: Autonomy gate blocks refunds >$50, plan changes without active subscription, missing customer identity
- **100% policy-grounded sensitive actions**: Every decision cites policy references from RAG
- **100% verified state changes**: Post-action verification compares expected vs observed state
- **Deterministic, auditable decisions**: No LLM in the autonomy gate — pure TypeScript rules

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Customer      │────▶│  Triage Agent    │────▶│  Billing Agent      │
│   Request       │     │  (Freshworks)    │     │  (detect duplicate, │
│   (chat/voice)  │     │                  │     │   decide refund)    │
└─────────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                             │
                              ┌──────────────────┐           │
                              │  Autonomy Gate   │◀──────────┤
                              │  (deterministic) │           │
                              └────────┬─────────┘           │
                                       │                     │
                    ┌──────────────────┼────────────────────┘
                    ▼                  ▼
           ┌───────────────┐   ┌────────────────┐
           │Subscription   │   │   Freshworks   │
           │Agent          │   │   MCP Tools    │
           │(check elig.,  │   │(issue_refund,  │
           │ decide upgrade)   upgrade_plan)    │
           └───────┬───────┘   └───────┬────────┘
                   │                   │
                   ▼                   ▼
           ┌───────────────┐   ┌────────────────┐
           │ Verification  │   │  Verification  │
           │(verifyUpgrade)│   │(verifyRefund)  │
           └───────┬───────┘   └───────┬────────┘
                   │                   │
                   └─────────┬─────────┘
                             ▼
                    ┌────────────────┐
                    │  Handoff (if   │
                    │  escalation)   │
                    │  Case Brief    │
                    └────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | npm workspaces |
| **Shared** | TypeScript 5.x strict, Zod 4.x schemas |
| **API** | Fastify 5, Drizzle ORM, PostgreSQL + pgvector |
| **Frontend** | React 19, Vite 7, Tailwind 4, TanStack Query 5, shadcn/ui |
| **Voice** | ElevenLabs Conversational AI (WebSocket) |
| **Agents** | Freshworks Agent Studio + MCP |
| **Testing** | Vitest (unit/integration), Playwright (E2E) |
| **Deployment** | Vercel |

## Working Demo

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ with pgvector
- Freshworks Developer Account (Agent Studio + MCP)
- ElevenLabs Account (Agents API)

### Quick Start
```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Configure DATABASE_URL, Freshworks, ElevenLabs credentials
npm run db:push
npm run db:seed
npm run dev
```

### Demo Flow
1. Open `http://localhost:5173/chat`
2. Send: `"I was charged twice and want to upgrade my plan"`
3. Watch trace: Triage → Billing (refund) + Subscription (upgrade)
4. View detailed trace at `/trace?runId=...`
5. Test high-value escalation: Request $600 refund → handoff at `/handoffs`

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/conversations` | Create conversation |
| POST | `/api/triage` | Triage → intents + tasks |
| POST | `/api/agent/process` | Full workflow |
| GET | `/api/traces/:runId` | Agent trace with tool I/O |
| GET | `/api/handoffs` | List pending handoffs |
| GET | `/api/handoffs/:id` | Case brief with evidence |
| PATCH | `/api/handoffs/:id/accept` | Operator accepts |
| PATCH | `/api/handoffs/:id/complete` | Operator resolves |
| POST | `/api/admin/seed-reset` | Reset demo data |

## Evaluation Results

### Autonomy Gate Evaluation
```
Total: 33 test cases
Passed: 33
Failed: 0
Accuracy: 100.0%  (Target: 90%+)

By Category:
  LOW_RISK:          5/5  (100%)
  MEDIUM_RISK:       3/3  (100%)
  HIGH_RISK:         4/4  (100%)
  PERMISSION_FAILURE:2/2  (100%)
  TOOL_FAILURE:      2/2  (100%)
  SUBSCRIPTION:      2/2  (100%)
  RISK_DETERMINATION:15/15 (100%)
```

### Test Coverage
- **Unit**: 29 tests (autonomy gate logic, risk determination)
- **Integration**: 11 tests (triage → specialists → verification flow)
- **E2E**: 15 Playwright scenarios (chat, voice, trace, handoff, theme, mobile)

## Built With

- **Freshworks** - Agent Studio (orchestration), MCP (tool execution)
- **ElevenLabs** - Conversational AI (voice input/output)
- **Vercel** - Hosting and deployment
- **PostgreSQL + pgvector** - Vector search for policy RAG
- **Drizzle ORM** - Type-safe database access
- **Zod 4** - Runtime validation at all boundaries
- **React 19 + TanStack Query** - Modern frontend data fetching
- **Tailwind CSS 4 + shadcn/ui** - Design system

## Team

| Role | Name |
|------|------|
| Backend/Architecture | Mahesh Boda |
| Frontend/UX | Mahesh Boda |
| Agent Integration | Mahesh Boda |

## Rubric Self-Assessment

| Criterion | Target | Achieved | Evidence |
|-----------|--------|----------|----------|
| Autonomous resolution rate | 90%+ | 100% (demo flow) | Evaluation suite: 33/33 |
| Unauthorized high-risk actions | 0 | 0 | Autonomy gate blocks all >$50 refunds |
| Policy-grounded sensitive actions | 100% | 100% | Every decision cites RAG policy refs |
| Verified state changes | 100% | 100% | verifyRefund/verifyUpgrade post-actions |
| End-to-end demo flow | Working | ✅ | Chat → Triage → Specialists → Verify |
| Handoff with case brief | Complete | ✅ | Evidence, policy, actions, recommendation |
| Trace observability | Full | ✅ | Timeline with expandable I/O |
| Deployment ready | Yes | ✅ | Vercel configs, env vars, seed reset |

## Video Walkthrough

[2-minute demo video showing: chat flow, trace visualization, high-value escalation, operator handoff view]

## Links

- **Repository**: [GitHub URL]
- **Live Demo**: [Vercel URL after deployment]
- **API Docs**: `/health`, `/api/*` endpoints

---

*ResolveX - Autonomous resolution with safety guarantees*