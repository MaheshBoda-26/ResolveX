# ResolveX Implementation Phases

## Phase 1: Project foundation
**Goal:** Create a runnable frontend, API, database connection, shared types, environment setup, and seed data.

**Features/tasks:** Monorepo, React/Vite, Fastify, shared schemas, PostgreSQL, seed script, health endpoint.

**Dependencies:** Repository, Node.js, PostgreSQL.

**Definition of done:** Frontend and API run locally, health endpoint passes, database connects, seed command works.

## Phase 2: Customer request and triage
**Goal:** Accept a customer request and turn it into executable tasks.

**Features/tasks:** Conversation UI, voice entry path, Triage Agent, intent/task schema, conversation persistence, triage trace.

**Dependencies:** Phase 1 and ElevenLabs access.

**Definition of done:** The main demo request produces billing and subscription tasks.

## Phase 3: Billing and subscription specialists
**Goal:** Implement the two specialist workflows.

**Features/tasks:** Billing Agent, Subscription Agent, customer lookup, transaction lookup, subscription lookup, context propagation.

**Dependencies:** Phase 2 and seeded account data.

**Definition of done:** Both specialists produce structured decisions and traces.

## Phase 4: Policy RAG and autonomy gate
**Goal:** Ground decisions and control autonomous actions.

**Features/tasks:** Policy ingestion, pgvector retrieval, evidence, permission rules, risk classification, deterministic autonomy gate.

**Dependencies:** Phase 3, PostgreSQL + pgvector, policy corpus.

**Definition of done:** Missing evidence or permission blocks sensitive actions.

## Phase 5: Freshworks actions/MCP and verification
**Goal:** Execute approved operations and verify results.

**Features/tasks:** Freshworks adapter, approved action schemas, refund action, subscription upgrade, tool trace, verification, safe failure handling.

**Dependencies:** Phase 4 and Freshworks access.

**Definition of done:** Main demo executes and verifies both requested changes.

## Phase 6: Human handoff
**Goal:** Handle requests outside autonomous authority.

**Features/tasks:** Escalation rules, case brief, evidence, policy, completed actions, recommendation, operator view.

**Dependencies:** Phase 5.

**Definition of done:** High-risk refund requests escalate without executing the restricted mutation.

## Phase 7: Agent Trace and evaluation
**Goal:** Make the product observable and measurable.

**Features/tasks:** Trace UI, run timeline, retrieval evidence, tool calls, verification results, evaluation dataset and runner.

**Dependencies:** Phases 2–6.

**Definition of done:** Judges can follow a complete run and the evaluation suite runs from one command.

## Phase 8: Demo polish and deployment
**Goal:** Produce a reliable hosted demo.

**Features/tasks:** Responsive UI, light/dark theme, ResolveX design system, seed reset, deployment, smoke tests, backup video, README.

**Dependencies:** Core MVP and evaluation.

**Definition of done:** Happy path repeats reliably, high-risk path escalates correctly, hosted demo works, backup video exists.

## Phase 9: Stage 1 submission
**Goal:** Submit the qualification package.

**Features/tasks:** Project description, Figma/working demo, 1–2 minute video, team details, built-with tags, rubric review.

**Dependencies:** Phase 8.

**Definition of done:** All required fields are complete and links work from a clean browser.

## Phase 10: Post-hackathon productization
**Goal:** Expand the MVP into a broader resolution platform.

**Features/tasks:** More workflows, reusable skills, integrations, production identity/permissions, evaluation, observability, human-agent collaboration.

**Dependencies:** Hackathon MVP and user feedback.

**Definition of done:** Multiple workflows run with explicit permissions, evaluation, auditability, and monitoring.
