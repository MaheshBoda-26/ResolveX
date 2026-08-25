# ResolveX — About the Project

## Inspiration

Customer support often stops at answering a request, even when resolving it requires checking policies, gathering customer information, using multiple systems, and taking follow-up actions. We wanted to explore a different approach: an AI agent that takes responsibility for completing the resolution.

## What it does

ResolveX is an autonomous customer resolution engine. It understands customer requests, breaks them into tasks, routes them to specialist agents, retrieves relevant policies and context, performs authorized actions, verifies the outcome, and escalates to a human when the request exceeds its authority.

## How we built it

We built ResolveX around a focused multi-agent workflow using Freshworks Agent Studio, Freshworks actions/MCP, ElevenLabs for voice interaction, and RAG for policy-grounded decisions.

The core flow is:

`Customer → Triage → Specialist Agent → Knowledge → Action → Verification → Resolution / Human Handoff`

## Challenges we ran into

The hardest part was balancing autonomy with control. We needed the agent to take meaningful actions while ensuring it had enough evidence, policy support, and permission before acting. We also focused on handling tool failures, coordinating multiple agents, and verifying that actions actually succeeded.

## Accomplishments we're proud of

We built a system focused on completing customer workflows rather than generating responses. ResolveX combines multi-agent orchestration, grounded decision-making, enterprise actions, verification, and structured human escalation into one flow.

## What we learned

Building reliable agents is less about making them smarter and more about giving them the right context, tools, permissions, and boundaries. A focused end-to-end workflow is also more valuable than a large collection of unfinished features.

## What's next

We plan to expand ResolveX into more customer-support workflows, add more enterprise integrations and reusable agent skills, and strengthen evaluation, observability, and human-agent collaboration.
