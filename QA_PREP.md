# ResolveX — Q&A Prep for Judges

## Q1: "How is this different from Zendesk/Intercom?"

**Answer (15s):**
> "Zendesk and Intercom are **ticketing systems** — they route humans to humans. ResolveX is an **autonomous resolution engine** — it routes humans to *actions*.
> 
> - **Zendesk**: Human reads ticket → human checks billing → human processes refund → human updates subscription → 2-3 days
> - **ResolveX**: Triage Agent → Billing + Subscription Agents → Autonomy Gate (deterministic safety) → Freshworks MCP execution → Verification → **30 seconds**
> 
> We don't replace the helpdesk; we **eliminate the queue** for action-heavy workflows. Agents handle only the 20% that require judgment."

---

## Q2: "What if ElevenLabs/Freshworks API fails?"

**Answer (20s):**
> "Three layers of resilience:
> 
> 1. **ElevenLabs (Voice)**: Optional layer. Text chat works independently. If voice fails, we fall back to text with a toast notification: *'Voice unavailable, using text mode.'*
> 
> 2. **Freshworks MCP (Actions)**: Every tool call is wrapped in retry + idempotency keys. If the API is down, the **Autonomy Gate** catches it at the verification layer — the action shows as `status: failed`, verification shows mismatch, and we **auto-escalate to human** with a complete case brief so the agent can retry manually.
> 
> 3. **Graceful Degradation**: The trace shows exactly what succeeded, what failed, and why. No silent failures. The human handoff includes full context so no customer repeats themselves."

---

## Q3: "How does the autonomy gate work?"

**Answer (25s):**
> "It's **deterministic TypeScript rules** — no LLM, no probability, no hallucination. Four hard gates must ALL pass:
> 
> | Gate | Check | Example |
> |------|-------|---------|
> | **Evidence** | Structured proof from agents | Billing agent found 2 transactions $99.99 within 24h |
> | **Policy** | RAG retrieval + citation | "Duplicate charges qualify for immediate refund" (doc #1) |
> | **Permission** | Customer initiated? | User said "I want to downgrade" → explicit consent |
> | **Risk** | Tier: LOW/MEDIUM/HIGH | Refund <$50 + plan change = LOW → auto-approve |
> 
> **Decision Matrix:**
> - All LOW risk + all gates pass → **AUTONOMOUS EXECUTION**
> - Any MEDIUM risk → **MANAGER APPROVAL** (queued, not blocked)
> - Any HIGH risk → **ESCALATE** (human handoff with case brief)
> 
> This is why we hit **100% accuracy on 33/33 eval cases** — the logic is auditable, testable, and explainable."