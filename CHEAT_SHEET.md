# ResolveX — Hackathon Cheat Sheet

---

## 📊 3 Key Stats

| Stat | Value |
|------|-------|
| **Autonomy Gate Accuracy** | 100% (33/33 eval cases passing) |
| **Response Time** | <2s end-to-end for autonomous resolutions |
| **Safety** | 0 unauthorized high-risk actions — all refunds >$50, plan changes without subscription, missing identity blocked |

---

## ⚡ 2 Unique Features

| Feature | What It Does |
|---------|--------------|
| **Autonomy Gate** (Evidence + Policy + Permission + Risk) | Deterministic TypeScript rules (no LLM) evaluate 4 dimensions before any mutation: evidence quality, policy citation, customer permission, risk tier → APPROVE / ESCALATE / BLOCK |
| **Post-Action Verification Layer** | Every state-changing action (refund, upgrade/downgrade) is followed by a verification call that confirms observed state matches expected outcome — catches tool failures, idempotency issues, race conditions |

---

## 🎯 1 Wow Factor

**The Demo Scenario: "Double Charged & Want to Downgrade"**

A single customer message triggers **two parallel specialist agents**:
- **Billing Agent**: Detects duplicate $99.99 charges (INV-003 + INV-004), cites "duplicate charges qualify for immediate refund" policy, issues refund
- **Subscription Agent**: Validates Pro→Basic downgrade eligibility, calculates proration, schedules change at cycle boundary

Both pass the **Autonomy Gate** (Evidence ✓, Policy ✓, Permission ✓, Risk: LOW) → execute via **Freshworks MCP** → **Verification Layer confirms both succeeded** → customer gets resolution in <30s with full trace visibility.

**Stack**: Fastify + Drizzle + PostgreSQL/pgvector + Freshworks MCP + ElevenLabs + React 19/TanStack Query

---

## 🎤 Elevator Pitch (15s)

> "ResolveX doesn't just answer support tickets — it resolves them. Triage → Specialist Agents → Policy RAG → Autonomy Gate → Action → Verification. 100% autonomous on our eval suite, zero unauthorized high-risk actions, deployed on Vercel."
