# Dashboard mutation failure UX (online-first)

## Applied pattern

Critical mutation flows now use `getMutationErrorMessage` (`apps/dashboard/src/lib/mutation-error.ts`) to show consistent, non-deceptive failure feedback:

- Inventory receive (`/inventory/buy`)
- Inventory sell (`/inventory/sell`)
- Transfer ship + receive (`/transfers/[id]`)
- Approvals decision submission (`/approvals`)

On mutation failure, the UI keeps the user on the same screen, does not show success copy, and surfaces a destructive alert with retry guidance.

## Offline / unreachable API behavior

When the API is offline or unreachable (for example `TypeError`, `Failed to fetch`, DNS/connection errors), mutation errors are normalized to:

- confirm the action was **not** saved/submitted, and
- guide the user to retry after checking connection/API availability.

If `NEXT_PUBLIC_API_URL` is not configured, users get an explicit setup message.

## Spot-check + manual checklist

### Spot-check flow: Sell mutation

1. Start dashboard with API unavailable.
2. Open `/inventory/sell`.
3. Submit a valid sale.
4. Verify destructive alert states sale was not recorded and includes retry guidance.
5. Verify no success banner is shown.

### Manual checklist

- [ ] Receive flow (`/inventory/buy`) shows non-success error + retry guidance when API is unreachable.
- [ ] Sell flow (`/inventory/sell`) shows non-success error + retry guidance when API is unreachable.
- [ ] Transfer ship and receive (`/transfers/[id]`) show non-success errors + retry guidance when API is unreachable.
- [ ] Approvals decision submit (`/approvals`) shows non-success error + retry guidance when API is unreachable.
- [ ] In all flows above, success state is not shown after a failed mutation.
