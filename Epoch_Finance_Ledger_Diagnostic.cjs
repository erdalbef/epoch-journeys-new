'use strict';
// Read-only diagnostic. Does not load .env and cannot use default database implicitly.
const { PrismaClient } = require('@prisma/client');
const EXPECTED = 'ep-red-waterfall-ai5fcms9.c-4.us-east-1.aws.neon.tech';
const url = process.env.EPOCH_FINANCE_TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('STOP: No session database URL. Run only in the PowerShell session used to start the development server.');
  process.exit(1);
}
let parsed;
try { parsed = new URL(url); } catch { console.error('STOP: Invalid database URL.'); process.exit(1); }
if (parsed.hostname !== EXPECTED || !['postgresql:', 'postgres:'].includes(parsed.protocol)) {
  console.error('STOP: Database hostname mismatch. No connection attempted.');
  console.error('Actual hostname:', parsed.hostname);
  process.exit(1);
}
const prisma = new PrismaClient({datasources:{db:{url}}});
const str = (v) => v == null ? 'null' : typeof v.toString === 'function' ? v.toString() : String(v);
async function main() {
  console.log('PASS: Expected development database selected');
  const payables = await prisma.supplierPayable.findMany({
    where: { title: { contains: 'ZURICH', mode: 'insensitive' }, currency: 'CHF', approvedAmount: {equals: 250}},
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true, title: true, supplierNameSnapshot: true, approvedAmount: true,
      amountPaid: true, balance: true, approvalStatus: true, paymentStatus: true,
      payments: {
        select: {
          id: true, amount: true, currency: true, reference: true, updatedAt: true,
          bankAccount: {select:{id:true,name:true,currency:true}},
          bankTransactions: {
            select: {
              id: true, amount: true, currency: true, reference: true,
              status: true, type: true, direction: true, updatedAt: true,
              reconciliationId: true, reconciledAt: true, reversedAt: true, reversalOfId: true,
              bankAccount: {select:{id:true,name:true,currency:true}},
            },
            orderBy: {createdAt:'asc'},
          },
        }, orderBy:{createdAt:'asc'},
      },
    },
  });
  console.log('Matching ZURICH CHF 250 payables:', payables.length);
  for (const p of payables) {
    console.log('\nPAYABLE',p.id, 'title=',p.title,'supplier=',p.supplierNameSnapshot);
    console.log('approved=',str(p.approvedAmount),p.currency || 'CHF','paid=',str(p.amountPaid),'balance=',str(p.balance),'status=',p.approvalStatus,p.paymentStatus);
    console.log('payment_count=',p.payments.length);
    for (const payment of p.payments) {
      console.log(' PAYMENT',payment.id,'amount=',str(payment.amount),payment.currency,'reference=',payment.reference,'updated=',payment.updatedAt.toISOString());
      console.log(' PAYMENT_BANK',payment.bankAccount?.name || 'none',payment.bankAccount?.currency || '');
      console.log(' linked_ledger_count=',payment.bankTransactions.length);
      for (const l of payment.bankTransactions) {
        console.log('  LEDGER',l.id,'amount=',str(l.amount),l.currency,'account=',l.bankAccount.name,'status=',l.status,'type=',l.type,'direction=',l.direction,'reference=',l.reference,'updated=',l.updatedAt.toISOString(),'reconciled=',Boolean(l.reconciliationId || l.reconciledAt),'reversed=',Boolean(l.reversedAt || l.reversalOfId));
      }
      if (!payment.bankTransactions.length && payment.reference) {
        const sameRef = await prisma.bankTransaction.findMany({where:{reference:payment.reference,type:'SUPPLIER_PAYMENT'},take:5,select:{id:true,amount:true,currency:true,supplierPayablePaymentId:true,bankAccount:{select:{name:true}}}});
        console.log(' SAME_REFERENCE_LEDGER_MATCHES',sameRef.map(l=>({id:l.id,amount:str(l.amount),currency:l.currency,linkedPaymentId:l.supplierPayablePaymentId,account:l.bankAccount.name})));
      }
    }
  }
  console.log('\nRESULT: Read-only Prisma diagnostic completed; no records changed.');
}
main().catch(e=>{console.error('DIAGNOSTIC FAILED:',e?.code||e?.name||'Error', e?.message||'');process.exitCode=1;}).finally(()=>prisma.$disconnect());
