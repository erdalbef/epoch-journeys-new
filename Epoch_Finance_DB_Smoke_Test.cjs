/**
 * Epoch Journeys development database smoke test.
 * Run from the Epoch Journeys project root with:
 *   $env:EPOCH_FINANCE_TEST_DATABASE_URL set in current PowerShell session
 *   node "C:\path\to\Epoch_Finance_DB_Smoke_Test.cjs"
 *
 * All inserted fixture records are inside ONE interactive Prisma transaction
 * that is unconditionally rolled back by a deliberate sentinel exception.
 * This is a DATABASE MODEL smoke test, NOT an authenticated payment API test.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const assert = require('assert/strict');
const expectedHost = 'ep-red-waterfall-ai5fcms9.c-4.us-east-1.aws.neon.tech';
const url = process.env.EPOCH_FINANCE_TEST_DATABASE_URL;
if (!url) { console.error('STOP: EPOCH_FINANCE_TEST_DATABASE_URL is missing.'); process.exit(1); }
let parsed;
try { parsed = new URL(url); } catch { console.error('STOP: Invalid connection string.'); process.exit(1); }
if (parsed.hostname !== expectedHost) { console.error('STOP: Unexpected database host.'); process.exit(1); }
if (!fs.existsSync(path.join(process.cwd(), 'prisma', 'schema.prisma'))) {
  console.error('STOP: Run this from the Epoch Journeys project root.'); process.exit(1);
}
const projectRequire = createRequire(path.join(process.cwd(), 'package.json'));
const { PrismaClient, Prisma } = projectRequire('@prisma/client');
const db = new PrismaClient({ datasources: { db: { url } }, log: ['error'] });
class IntentionalRollback extends Error { constructor() { super('INTENTIONAL_TEST_ROLLBACK'); } }
const nonce = `EPOCH_DB_SMOKE_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
(async () => {
  try {
    await db.$queryRaw`SELECT 1`;
    console.log('PASS: Development database connection');
    let checks = 0;
    try {
      await db.$transaction(async tx => {
        const supplier = await tx.supplier.create({data: {
          name: nonce, type: 'OTHER', defaultCurrency: 'CHF'
        }});
        const bank = await tx.bankAccount.create({data: {
          name: nonce, currency: 'EUR'
        }});
        const payable = await tx.supplierPayable.create({data: {
          supplierId: supplier.id, title: nonce, supplierNameSnapshot: nonce,
          currency: 'CHF', approvedAmount: '250.00', balance: '250.00',
          approvalStatus: 'APPROVED', paymentStatus: 'UNPAID'
        }});
        checks++;
        console.log('PASS: CHF approved payable / EUR bank fixture');

        // First partial settlement: 100 CHF costs 110 EUR.
        const first = await tx.supplierPayablePayment.create({data: {
          payableId: payable.id, bankAccountId: bank.id,
          amount: '100.00', currency: 'CHF', method: 'BANK_TRANSFER'
        }});
        await tx.bankTransaction.create({data: {
          bankAccountId: bank.id, supplierPayablePaymentId: first.id,
          type: 'SUPPLIER_PAYMENT', direction: 'OUT',
          amount: '110.00', currency: 'EUR', status: 'POSTED'
        }});
        await tx.supplierPayable.update({where: {id: payable.id}, data: {
          amountPaid: '100.00', balance: '150.00', paymentStatus: 'PARTIALLY_PAID'
        }});
        const firstRows = await tx.supplierPayablePayment.findUnique({
          where: {id: first.id}, include: {bankTransactions: true}
        });
        assert.equal(firstRows.amount.toFixed(2), '100.00');
        assert.equal(firstRows.currency, 'CHF');
        assert.equal(firstRows.bankTransactions.length, 1);
        assert.equal(firstRows.bankTransactions[0].amount.toFixed(2), '110.00');
        assert.equal(firstRows.bankTransactions[0].currency, 'EUR');
        checks++;
        console.log('PASS: Separate supplier and bank-debit currencies / amounts');

        // Second partial settlement completes the supplier obligation.
        const second = await tx.supplierPayablePayment.create({data: {
          payableId: payable.id, bankAccountId: bank.id,
          amount: '150.00', currency: 'CHF', method: 'BANK_TRANSFER'
        }});
        await tx.bankTransaction.create({data: {
          bankAccountId: bank.id, supplierPayablePaymentId: second.id,
          type: 'SUPPLIER_PAYMENT', direction: 'OUT',
          amount: '165.00', currency: 'EUR', status: 'POSTED'
        }});
        await tx.supplierPayable.update({where: {id: payable.id}, data: {
          amountPaid: '250.00', balance: '0.00', paymentStatus: 'PAID'
        }});
        const aggregate = await tx.supplierPayablePayment.aggregate({
          where: {payableId: payable.id}, _sum: {amount: true}
        });
        const finalPayable = await tx.supplierPayable.findUnique({where: {id: payable.id}});
        assert.equal(aggregate._sum.amount.toFixed(2), '250.00');
        assert.equal(finalPayable.amountPaid.toFixed(2), '250.00');
        assert.equal(finalPayable.balance.toFixed(2), '0.00');
        checks++;
        console.log('PASS: Two partial settlements total 250.00 CHF / balance 0.00 CHF');

        const ledgerRows = await tx.bankTransaction.findMany({
          where: {supplierPayablePaymentId: {in: [first.id, second.id]}}
        });
        const eurTotal = ledgerRows.reduce((sum, r) => sum.plus(r.amount), new Prisma.Decimal(0));
        assert.equal(eurTotal.toFixed(2), '275.00');
        checks++;
        console.log('PASS: EUR bank debits total 275.00 independently of CHF supplier balance');

        const locked = await tx.$queryRaw`
          SELECT "id" FROM "SupplierPayable" WHERE "id" = ${payable.id} FOR UPDATE
        `;
        assert.equal(locked.length, 1);
        checks++;
        console.log('PASS: Payable row-lock SQL supported by development database');

        throw new IntentionalRollback();
      }, {timeout: 20000, maxWait: 10000});
      throw Error('STOP: Smoke test unexpectedly COMMITTED');
    } catch (e) {
      if (!(e instanceof IntentionalRollback)) throw e;
    }
    const remaining = await db.supplier.findFirst({where: {name: nonce}, select: {id:true}});
    assert.equal(remaining, null, 'Test fixture survived rollback');
    console.log('PASS: Test supplier, payable, payments, and ledger records rolled back');
    console.log(`RESULT: ${checks} database smoke checks passed; no test fixture persisted.`);
    console.log('NOTE: Authenticated API/concurrent-request/reconciliation-race tests remain pending.');
  } catch (e) {
    console.error('FAIL:', e && e.message ? e.message : String(e));
    process.exitCode = 1;
  } finally { await db.$disconnect(); }
})();
