# ResolveX Product Requirements Document

## Problem statement
Customer support requests often require more than an answer. A single request may require account lookup, policy retrieval, billing investigation, subscription changes, and confirmation across multiple systems. ResolveX addresses this gap by giving an agent the ability to investigate, take authorized actions, verify the resulting state, and escalate to a human when the request exceeds its authority.

## What to build
Build ResolveX, an autonomous customer resolution engine for a focused customer-support workflow. A customer speaks or types a request such as, “I was charged twice and I want to upgrade my plan.” ResolveX uses a triage agent to split the request, routes work to billing and subscription specialist agents, retrieves policy and customer context, executes approved actions through Freshworks actions/MCP, verifies the resulting state, and either resolves the request or creates a structured human handoff.

## Targeted users
- Customer support teams handling repetitive, action-heavy requests.
- Support agents who need customer context, policy evidence, and actions prepared for them.
- Support operations leaders seeking higher autonomous resolution and lower manual handling.
- Customers who want problems completed in one interaction.

## Features

### Must-have
1. Customer voice/chat intake using ElevenLabs for the voice path.
2. Triage Agent for intent detection and task decomposition.
3. Billing Agent for transaction lookup and duplicate-charge resolution.
4. Subscription Agent for plan eligibility and upgrade actions.
5. Policy/RAG layer for grounded decisions.
6. Freshworks actions and/or MCP-connected tools for enterprise operations.
7. Autonomy gate based on evidence, policy, permission, and risk.
8. Post-action verification.
9. Human handoff with a complete case brief.
10. Agent Trace showing decisions, retrieval, tool calls, results, and verification.
11. Controlled evaluation set for core workflows and safety boundaries.

### Nice-to-have
- Additional customer-support workflows.
- More reusable specialist skills.
- Additional enterprise integrations.
- Expanded evaluation analytics.
- Richer agent observability.
- Additional voice and chat channels.

## Goals and success metrics
- Demonstrate end-to-end autonomous resolution for a real support workflow.
- Use Freshworks capabilities as a meaningful part of the product.
- Use ElevenLabs as a useful customer interaction layer.
- Demonstrate safe autonomy rather than unrestricted tool execution.
- Produce a hosted, judge-ready prototype.
- Target 90%+ correct autonomous-or-escalation decisions on the controlled test set.
- Target 0 unauthorized high-risk actions.
- Ground 100% of sensitive actions in an applicable policy or explicit rule.
- Verify 100% of successful demo state-changing actions.
- Ensure human handoffs contain enough context to continue the case.

Actual benchmark values must come from the final test run.

## Out of scope
- WhatsApp and additional messaging channels.
- Native mobile applications.
- Full CRM replacement.
- Broad multi-industry support.
- Ten or more specialist agents.
- Large-scale marketplace functionality.
- Autonomous actions outside explicit permission boundaries.
- Custom foundation-model training.
- Production payment processing.
- Complex analytics unrelated to the core resolution workflow.

## Constraints
- 24-hour in-person build for shortlisted teams.
- Stage 1 requires a prototype or working demo, written submission, short video, and team details.
- The product must remain small enough to demo reliably.
- Track 1 requires meaningful use of Freshworks Agent Studio, MCP, and multi-agent orchestration.
- ElevenLabs should support the customer-facing voice experience.
- One complete workflow takes priority over breadth.

## Assumptions
- Freshworks developer access and credentials are available.
- ElevenLabs access is available.
- A small synthetic customer/account dataset is sufficient for the demo.
- Policies are represented as a controlled knowledge corpus.
- Freshworks actions or MCP access supports the selected operations.
- A direct tool adapter is available as a fallback if the preferred MCP path is unavailable.
- The final system is a hackathon prototype, not a production billing processor.
