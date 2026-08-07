# Supplier CRM & Mass Arrangements — First UI Pass

## Added
- Admin sidebar links for Suppliers and Mass Arrangements
- `/admin/suppliers` searchable/filterable Supplier CRM list
- `/admin/suppliers/new` create supplier
- `/admin/suppliers/[id]` supplier CRM profile
- `/admin/suppliers/[id]/edit` edit supplier
- Supplier contacts
- Supplier services
- Historical/contracted rates
- Supplier contracts/document links
- `/admin/mass-arrangements` Mass arrangement register
- `/admin/mass-arrangements/new` pilgrimage-specific Mass arrangement form
- Admin APIs for supplier CRUD and nested CRM records

## Design principles
- Permanent church/shrine information lives in Supplier CRM.
- Individual Mass requests/confirmations live in MassArrangement.
- Supplier rates are date-bounded rather than overwritten.
- Supplier CRM is designed to feed later Tour Costing, Quotes, Operations and Finance.

## Database
This project includes the Supplier CRM `schema.prisma` that was already pushed to the development database.
No additional schema change is introduced by this UI pass.
