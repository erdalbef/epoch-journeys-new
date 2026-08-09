# Epoch Journeys Sales Documents

## Included
- Sales Documents list
- Create Proforma / Invoice / Credit Note draft
- Booking prefill
- Editable English/Bulgarian service, VAT and payment text
- Permanent number assigned only on Issue
- Branded bilingual PDF
- Email PDF attachment through existing Resend helper
- Finance Center and Admin navigation integration

## IMPORTANT: Bulgarian PDF font
The logo is included, but font files are intentionally not bundled.
For Cyrillic/Bulgarian PDF output, place these files yourself:

public/fonts/NotoSans-Regular.ttf
public/fonts/NotoSans-Bold.ttf

Noto Sans is available from Google Fonts. Do not rename the files unless you also update `src/lib/sales-document-pdf-data.ts`.

## Install
Copy the package contents into the project root, preserving paths.

Then run:

npx prisma validate
npx prisma generate
npm run build

No Prisma schema change is included here because the SalesDocument models were already added and pushed successfully before this package.

## First test
1. Open `/admin/finance/sales-documents`.
2. Create a Proforma linked to a booking.
3. Review recipient, English/Bulgarian wording and line items.
4. Save Draft.
5. Open the document and click Issue Document.
6. Open PDF.
7. Send by Email.

## Numbering
- Proforma: PF-YYYY-0001
- Invoice: INV-YYYY-0001
- Credit Note: CN-YYYY-0001

Numbers are assigned only when a draft is issued.
