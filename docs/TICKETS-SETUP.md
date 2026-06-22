# Conference tickets + cPay setup

## What is already built

- **Pages (MK + EN):** `tickets.html`, `ticket-checkout.html`, `ticket-success.html`, `ticket-failed.html`, `ticket-cancelled.html`, `ticket-bank.html`, `ticket-status.html`
- **API (Vercel):** `/api/tickets/config`, `create-order`, `pay`, `status`
- **Database:** `ticket_orders` table (migration `20260601000003_ticket_orders.sql`)
- **Mock mode:** `CPAY_MODE=mock` simulates successful card payment

## Before first test

1. Run migration in Supabase SQL editor (or `supabase db push`).
2. Copy `.env.example` → Vercel project environment variables.
3. Set `SUPABASE_SERVICE_ROLE_KEY` (server only — never in frontend).
4. Set `SITE_URL` to your deployed domain.
5. Deploy with `npm install` (Vercel runs this automatically).

## Configure pricing & bank (no cPay yet)

| Variable | Example |
|----------|---------|
| `MHRA_TICKET_EARLY_BIRD_MKD` | `4500` |
| `MHRA_TICKET_REGULAR_MKD` | `6000` |
| `MHRA_TICKET_EARLY_BIRD_UNTIL` | `2026-09-01` |
| `MHRA_BANK_NAME` | Bank name from officials |
| `MHRA_BANK_IBAN` | MK… |
| `MHRA_BANK_SWIFT` | … |

## When bank sends cPay ZIP

1. Set in Vercel:
   - `CPAY_MODE=live`
   - `CPAY_MERCHANT_TIN`
   - `CPAY_MERCHANT_PASSWORD`
   - `CPAY_MERCHANT_NAME`
   - `CPAY_SERVER_PUBLIC_KEY_PEM`
   - `CPAY_CLIENT_PRIVATE_KEY_PEM`
2. Complete encryption in `api/lib/cpay/crypto.js` (ReceiveEncodedMessage per PDF v1.6).
3. Wire `api/tickets/pay.js` live branch to Initiate → 3DS → Verify → Execute.
4. Test with bank sandbox cards before production.

## cPay field mapping (already handled in code)

| cPay field | Our source |
|------------|------------|
| `Details2` | `ticket_orders.details2` (max 10 chars, unique) |
| `Details1` | Early Bird / conference label |
| `Amount` | `total_amount_cpay` (MKD × 100) |
| Buyer fields | Checkout form |

## Local dev

- Static pages: `npx serve` (forms will fail API calls).
- Full flow: `npx vercel dev` with `.env` loaded.

## Admin

View orders in Supabase table `ticket_orders` or add an admin screen later.
