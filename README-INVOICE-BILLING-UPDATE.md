# Invoice Billing Update

This update adds:
- active booking prefill
- Bill To dropdown from approved agents and partner companies
- two billing email addresses
- billing-profile persistence for future invoices
- automatic booking deposit / paid amount
- manual paid/deposit amount for non-booking invoices
- Additional Information on screen and PDF
- secondary email delivery
- cleaner PDF behavior when there is no booking/group data
- INVOICE / ФАКТУРА title for final invoices

## Apply in this order
1. Replace `prisma/schema.prisma` with the included `schema.prisma`.
2. Run:
   - `npx prisma format`
   - `npx prisma validate`
3. Apply database changes using your current development workflow (you previously used `npx prisma db push`).
4. Run `npx prisma generate`.
5. Copy the included `src/...` files into the matching project paths.
6. Run `npm run build`.

## Important
The issuer header continues to use the values in `src/lib/sales-documents.ts`. Replace the current generic `Sofia, Bulgaria` value with Epoch Journeys OOD's exact registered legal address before issuing real invoices.
