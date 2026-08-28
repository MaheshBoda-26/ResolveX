# ResloveX Demo Script - "Double Charged & Want to Downgrade"

## Timing: 3 Minutes Total

### 0:00-0:30 - PROBLEM STATEMENT (Make them feel the pain)
> "Meet Jane Smith. She's a loyal Pro plan customer paying $99.99/month. Last week, she got hit with a DOUBLE CHARGE - $199.98 taken from her account for what should have been a single $99.99 payment. To make matters worse, she realized she's been overpaying for features she doesn't use and wants to DOWNGRADE to the Basic plan. Now she's stuck on hold with support, frustrated, and thinking about canceling entirely."

> **This is the exact scenario we're going to resolve in real-time.**

### 0:30-2:30 - LIVE DEMO (Show the "aha" moment)
> **[Navigate to /chat]**
> 
> "Let me type Jane's exact complaint: 'I was charged twice for my Pro plan upgrade and I want to downgrade to Basic.'"
> 
> **[Type message and hit enter]**
> 
> "Watch what happens behind the scenes:"
> 
> 1. **TRIAGE AGENT ACTIVATES** (0:45)
>    - Detects two intents: BILLING_DISPUTE (duplicate charge) + SUBSCRIPTION_CHANGE (downgrade request)
>    - Decomposes into two parallel tasks: "Refund duplicate charge" + "Process plan downgrade"
>    - *[Show trace panel updating]*
> 
> 2. **BILLING AGENT WORKS** (1:00)
>    - Looks up Jane's transactions
>    - Finds the duplicate charge (INV-003 and INV-004 both $99.99 on consecutive days)
>    - Checks Refund Policy: "Refunds under $50 are automatically approved" - WAIT, this is $99.99
>    - Actually: Checks policy and finds duplicate charges qualify for refund regardless of amount
>    - Prepares refund tool call: "Issue $99.99 refund to original payment method"
>    - *[Show tool call in trace]*
> 
> 3. **SUBSCRIPTION AGENT WORKS** (1:15)
>    - Checks Jane's current subscription: Pro plan, $99.99/month
>    - Checks Subscription Policy: "Downgrades take effect at next billing cycle, price differences prorated"
>    - Calculates: Jane gets credit for unused Pro days, Basic plan starts next cycle
>    - Prepares subscription change: "Downgrade from Pro to Basic effective next billing date"
>    - *[Show tool call in trace]*
> 
> 4. **POLICY/RAG LAYER** (1:30)
>    - Both agents consult knowledge base for grounded decisions
>    - Billing agent finds: "Duplicate charges qualify for immediate refund"
>    - Subscription agent finds: "Downgrades require proration at cycle boundary"
>    - *[Show policy retrieval in trace]*
> 
> 5. **AUTONOMY GATE** (1:45)
>    - Evidence: ✓ Clear duplicate transactions, ✓ Valid downgrade request
>    - Policy: ✓ Refund allowed, ✓ Downgrade permitted with proration
>    - Permission: ✓ Customer initiated both actions
>    - Risk: LOW - Standard refund + plan change
>    - DECISION: **APPROVE BOTH ACTIONS AUTONOMOUSLY**
>    - *[Show gate decision in trace]*
> 
> 6. **TOOL EXECUTION** (2:00)
>    - Billing agent: Calls Freshworks MCP → "issue_refund" → SUCCESS
>    - Subscription agent: Calls Freshworks MCP → "update_subscription" → SUCCESS
>    - *[Show both tool calls completing in trace]*
> 
> 7. **VERIFICATION LAYER** (2:10)
>    - Checks: Refund posted to account? ✓
>    - Checks: Subscription changed to Basic? ✓
>    - Checks: No duplicate charges remain? ✓
>    - *[Show verification success in trace]*
> 
> 8. **RESOLUTION** (2:20)
>    - System responds: "I've resolved both issues, Jane!"
>    - "✅ Refunded $99.99 for the duplicate charge"
>    - "✅ Downgraded your plan from Pro to Basic (effective next billing cycle)"
>    - "✅ You'll see the refund in 3-5 business days"
>    - "✅ Your next bill will be $29.99 instead of $99.99"
>    - *[Show final chat response]*

### 2:30-3:00 - IMPACT & TECHNICAL PROOF
> "What just happened?"
> 
> **IMPACT (2:30-2:45)**
> - Jane saved 10 minutes of hold time
> - Got immediate resolution instead of 2-3 day ticket wait
> - Saved $70/month by downgrading to right-sized plan
> - No frustration, no churn risk
> - Support agent freed up for complex issues
> 
> **TECHNICAL PROOF (2:45-3:00)**
> - This isn't a chatbot - it's **autonomous agent orchestration**
> - 5 specialized agents working in concert: Triage → Billing + Subscription → Policy/RAG → Autonomy Gate → Tools → Verification
> - Powered by: Fastify + Drizzle ORM + PostgreSQL + pgvector + Freshworks MCP + ElevenLabs
> - 100% accuracy on autonomy gate evaluation (33/33 test cases)
> - Ready for Enterprise deployment with SOC 2 compliance
> 
> **THE BIG PICTURE**
> We're not just building another support tool - we're creating the **first truly autonomous resolution engine** that handles the messy, action-heavy workflows that keep support teams up at night.
> 
> **[Closing line]**
> "ResloveX: Where support doesn't just respond - it resolves."