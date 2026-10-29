# SkyRex Complete Payment Service

This change introduces the entire payment layer for SkyRex: mobile money STK push for all four TZ providers (M-Pesa, Airtel, Tigo, Halotel), a wallet system, QR bus-fare payments, cash confirmation, P2P transfers, bill payments, receipts, history, refunds, and admin reporting. The migration creates four new tables (`wallets`, `transactions`, `qr_payment_tokens`, `payment_splits`) and extends four order tables idempotently. The architecture is a single unified `POST /pay` endpoint that dispatches by `context` and `method`, with webhooks receiving provider callbacks to finalise each transaction.

Watch for: (1) **confirmed** — the admin refund endpoint does not reverse payee splits, so a refund credits the payer's wallet but leaves the payee's share intact; (2) **confirmed** — the transfer block computes `fee` and `netAmount` using `PLATFORM_FEE_RATES.transfer = 0.00`, producing dead code that silently becomes a live fee if the rate is ever changed without adding a UI disclosure path; (3) **confirmed** — webhook signature verification is a plain string comparison, not HMAC, leaving all four provider callbacks vulnerable to replay if `WEBHOOK_SECRET` leaks; (4) **confirmed** — `/history` accepts an unbounded `limit` from the query string, allowing a client to pull the entire transaction table into memory in one request.

**Verdict**: NEEDS_CHANGES

---

## High-level view

All 13 required endpoints are present, the router exports correctly, all seven `context` values are handled in `POST /pay`, all four providers have webhook handlers, and `creditPayee` / `handlePaymentSuccess` are wired correctly for all order types including `university_orders`. The migration is fully idempotent.

The admin refund path credits the payer's wallet in full but skips the split-reversal logic that the user self-service refund performs. A payee whose share has already settled to their wallet keeps those funds, and the platform-fee split row remains in `pending` state — so the settlement report will count a fee that was never actually collected.

The transfer context computes `fee = Math.round(amount * 0.00)` — always zero — and then returns `fee` and `net_received` in the response as if a fee might exist. The arithmetic is currently harmless, but the scaffolding is wired to a live rate constant: set `PLATFORM_FEE_RATES.transfer` to any non-zero value and the fee starts being charged silently with no disclosure to the user.

Webhook security is the most important pre-production gap. All four handlers accept any POST that passes a plain `x-webhook-secret` string. Until per-provider HMAC-SHA256 verification is wired in, a leaked or guessed secret lets an attacker mark arbitrary transactions as completed without paying.

The `/history` endpoint passes `Number(req.query.limit)` directly to `LIMIT` with no upper bound. A single malformed request can pull the full user transaction table into Node memory.

---

<details>
<summary>Issues (4)</summary>

1. **Admin refund skips split reversal** — `POST /admin/refund` credits the payer's wallet but does not reverse `payment_splits` rows or deduct from the payee's wallet, unlike the user self-service refund. The payee keeps their share and the platform-fee split stays `pending` in the settlement report. Either replicate the split-reversal logic from `/refund`, or explicitly mark those splits as `absorbed` and document that admin refunds are funded by the platform.

2. **Dead transfer-fee code creates silent-charge risk** — `PLATFORM_FEE_RATES.transfer` is `0.00`, so `fee` is always 0 at runtime. But the computation path (`fee`, `netAmount`, split inserts with a `platform` row) is fully wired and responds with `fee`/`net_received` fields. If the rate constant is set to non-zero without also adding user-facing disclosure, the fee silently activates. Either remove the dead arithmetic and always use `fee = 0, netAmount = amount`, or add a disclosure guard that rejects a non-zero transfer fee unless `description` carries a fee notice.

3. **Webhook signature is plain-string bearer token, not HMAC** — `verifyWebhookSecret` compares `x-webhook-secret` as a literal string. This doesn't prevent replay attacks, body tampering after TLS termination, or cross-provider forgery. The correct HMAC-SHA256 implementation is already documented inline; the placeholder needs to replace the current `provided === secret` check before production.

4. **Unbounded pagination in `/history`** — `limit` comes from `req.query` with no cap. Enforce `const safeLimit = Math.min(Number(limit), 100)` to prevent memory exhaustion.

</details>

---

<details>
<summary>Details</summary>

### Admin refund split asymmetry (confirmed)

User self-service `/refund` does this:

```typescript
// reverse payee splits + debit payee wallet
await db.query(`UPDATE payment_splits SET status = 'reversed' WHERE ...`);
await db.query(`UPDATE wallets SET balance = GREATEST(0, balance - $1) ...`);
```

`POST /admin/refund` does this:

```typescript
// credit original payer's wallet only
await db.query(`INSERT INTO wallets ... ON CONFLICT ... DO UPDATE SET balance = wallets.balance + $2`);
// marks original tx as refunded, inserts refund credit tx
// — NO split reversal, NO payee wallet deduction
```

The payer is made whole but the payee keeps their share. For a refunded ride, the driver retains payment for a trip that was reversed. The platform-fee split row stays at `status = 'pending'`, so `GET /admin/report` will include it in `pending_splits.amount` — counting a fee that was never actually collected and creating a permanent reconciliation mismatch.

### Dead transfer-fee code (confirmed)

```typescript
const feeRate   = PLATFORM_FEE_RATES.transfer;   // 0.00
const fee       = Math.round(Number(amount) * feeRate);  // always 0
const netAmount = Number(amount) - fee;                  // always == amount
```

At `0.00` the debit equals the credit and the split inserts a `platform` row with `amount = 0`. Harmless now, but the code path — including a wallet debit, a `payment_splits` insert for the platform, and a `net_received` response field — is fully live. A one-line change to the constant activates a fee without any frontend disclosure or test coverage catching it.

### Webhook security gap (confirmed)

All four webhook handlers reach `verifyWebhookSecret`, which does:

```typescript
const provided = req.headers['x-webhook-secret'];
return provided === secret;
```

This is a bearer-token check: it proves the caller knew the secret at request time but does nothing to authenticate the request body. It doesn't cover:
- Replay attacks (the same captured request can be re-submitted indefinitely)
- Body tampering if TLS terminates before this service
- Cross-provider identity (all four providers share one secret; a callback from one provider's infrastructure can forge a callback for another)

The code already contains the exact per-provider HMAC implementation as inline comments. Replacing `provided === secret` with `crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(header))` (using the raw body buffer) is the required production fix.

### Unbounded history pagination (confirmed)

```typescript
const { page = 1, limit = 20, ... } = req.query;
// ...
p.push(Number(limit), offset);
q += ` ORDER BY created_at DESC LIMIT $${p.length - 1} OFFSET $${p.length}`;
```

`Number(req.query.limit)` with no ceiling. The total-count query is also a separate full `COUNT(*)` scan on every page request. Both issues are resolved with `const safeLimit = Math.min(Number(limit), 100)` and caching or estimating the count.

### Test coverage

No test files are included in this diff. The payment system has several concurrent-access scenarios — double-spend on QR pay (two passengers scan the same code simultaneously), duplicate webhook delivery for the same reference, and simultaneous `handlePaymentSuccess` + `handlePaymentFailure` callbacks — that cannot be safely validated from code inspection alone. The `FOR UPDATE` row locks in `qr/pay` and `handlePaymentSuccess` are the right mechanism, but their correctness under race conditions requires integration tests hitting a real database.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `services/api-gateway/src/routes/payments.ts` | New file — full payment router: 13 endpoints, 4 webhooks, helper functions |
| `services/api-gateway/migrations/011_payments.sql` | New migration — creates wallets, transactions, qr_payment_tokens, payment_splits; alters trips, food_orders, shop_orders, university_orders |

Full diff: `git diff main -- services/api-gateway/src/routes/payments.ts services/api-gateway/migrations/011_payments.sql`

</details>
