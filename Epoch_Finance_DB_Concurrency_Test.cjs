/**
 * Epoch Journeys — isolated Neon DEVELOPMENT DB transaction concurrency check.
 * Tests PostgreSQL/Prisma row-lock behaviour, not NextAuth/HTTP endpoint code.
 * Run only from project root with EPOCH_FINANCE_TEST_DATABASE_URL set.
 * Temporary fixture records COMMIT during the test and are deleted in finally.
 * In the unlikely event of forced interruption, search for EPOCH_FINANCE_CONCURRENCY_ fixtures.
 */
'use strict';
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');

const expected = 'ep-red-waterfall-ai5fcms9.c-4.us-east-1.aws.neon.tech';
const conn = process.env.EPOCH_FINANCE_TEST_DATABASE_URL;
if (!conn) { console.error('STOP: Development connection is missing.'); process.exit(1); }
let parsed;
try { parsed = new URL(conn); } catch { console.error('STOP: Invalid development connection string.'); process.exit(1); }
if (parsed.hostname !== expected) { console.error('STOP: Unexpected DB host; refusing to run.'); process.exit(1); }
if (!fs.existsSync(path.join(process.cwd(), 'prisma', 'schema.prisma'))) {
  console.error('STOP: Run from the Epoch Journeys project root.'); process.exit(1);
}
const projectRequire = createRequire(path.join(process.cwd(), 'package.json'));
const { PrismaClient, Prisma } = projectRequire('@prisma/client');
const db = new PrismaClient({ datasources: { db: { url: conn } }, log: ['error'] });
const nonce = 'EPOCH_FINANCE_CONCURRENCY_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
let supplierId, payableId, bankId, paymentId, ledgerId;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const gate = () => { let open; const promise = new Promise(resolve => { open = resolve; }); return { promise, open }; };
const opts = { maxWait: 12000, timeout: 25000 };

async function lockPayable(tx) {
  const rows = await tx.$queryRaw`SELECT "id" FROM "SupplierPayable" WHERE "id" = ${payableId} FOR UPDATE`;
  assert.equal(rows.length, 1);
}
async function cleanup() {
  if (ledgerId) await db.bankTransaction.deleteMany({ where: { id: ledgerId } });
  if (paymentId) await db.supplierPayablePayment.deleteMany({ where: { id: paymentId } });
  if (payableId) await db.supplierPayable.deleteMany({ where: { id: payableId } });
  if (bankId) await db.bankAccount.deleteMany({ where: { id: bankId } });
  if (supplierId) await db.supplier.deleteMany({ where: { id: supplierId } });
}
async function run() {
  await db.$queryRaw`SELECT 1`;
  console.log('PASS: Expected development database connected');
  const supplier = await db.supplier.create({ data: {
    name: nonce, type: 'OTHER', defaultCurrency: 'CHF'
  }}); supplierId = supplier.id;
  const bank = await db.bankAccount.create({ data: {
    name: nonce, currency: 'EUR'
  }}); bankId = bank.id;
  const payable = await db.supplierPayable.create({ data: {
    supplierId, title: nonce, supplierNameSnapshot: nonce,
    currency: 'CHF', approvedAmount: '250.00', balance: '250.00',
    approvalStatus: 'APPROVED', paymentStatus: 'UNPAID'
  }}); payableId = payable.id;

  // Two simultaneous attempts to settle 150 CHF against a 250 CHF payable.
  // One must obtain the row lock first; the other must re-read the balance.
  const aLocked = gate();
  const releaseA = gate();
  let bGotLock = false;
  const a = db.$transaction(async tx => {
    await lockPayable(tx);
    aLocked.open();
    await releaseA.promise;
    const current = await tx.supplierPayable.findUnique({where: {id: payableId}});
    assert.equal(current.balance.toFixed(2), '250.00');
    await tx.supplierPayable.update({where: {id: payableId}, data: {
      balance: '100.00', amountPaid: '150.00', paymentStatus: 'PARTIALLY_PAID'
    }});
  }, opts);
  try {
    await aLocked.promise;
    const b = db.$transaction(async tx => {
      await lockPayable(tx);
      bGotLock = true;
      const current = await tx.supplierPayable.findUnique({where: {id: payableId}});
      assert.equal(current.balance.toFixed(2), '100.00', 'Second writer saw stale balance');
      assert(new Prisma.Decimal('150.00').gt(current.balance), 'Second settlement should exceed balance');
      return 'REJECTED_OVERPAYMENT';
    }, opts);
    await delay(250);
    assert.equal(bGotLock, false, 'Concurrent transaction bypassed payable row lock');
    releaseA.open();
    await a;
    assert.equal(await b, 'REJECTED_OVERPAYMENT');
  } finally { releaseA.open(); await a.catch(() => {}); }
  console.log('PASS: Simultaneous 150+150 CHF settlement attempts serialize; second detects insufficient balance');

  // Set up one posted CHF payment linked to a EUR bank transaction.
  const payment = await db.supplierPayablePayment.create({data: {
    payableId, bankAccountId: bankId, amount: '150.00', currency: 'CHF', method: 'BANK_TRANSFER'
  }}); paymentId = payment.id;
  const ledger = await db.bankTransaction.create({data: {
    bankAccountId: bankId, supplierPayablePaymentId: paymentId,
    type: 'SUPPLIER_PAYMENT', direction: 'OUT', status: 'POSTED', amount: '165.00', currency: 'EUR'
  }}); ledgerId = ledger.id;

  // Reconciliation acquires bank-row lock first; payment edit waits and re-reads.
  const reconcilerLocked = gate();
  const releaseReconciler = gate();
  let editorAcquired = false;
  const reconcile = db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "BankTransaction" WHERE "id" = ${ledgerId} FOR UPDATE`;
    reconcilerLocked.open();
    await releaseReconciler.promise;
    await tx.bankTransaction.update({where: {id: ledgerId}, data: {reconciledAt: new Date()}});
  }, opts);
  try {
    await reconcilerLocked.promise;
    const editor = db.$transaction(async tx => {
      await lockPayable(tx);
      await tx.$queryRaw`SELECT "id" FROM "BankTransaction" WHERE "supplierPayablePaymentId" = ${paymentId} FOR UPDATE`;
      editorAcquired = true;
      const current = await tx.bankTransaction.findUnique({where: {id: ledgerId}});
      assert(current.reconciledAt !== null, 'Edit did not see the reconciliation state');
      return 'REJECTED_RECONCILED_EDIT';
    }, opts);
    await delay(250);
    assert.equal(editorAcquired, false, 'Edit bypassed locked bank row');
    releaseReconciler.open();
    await reconcile;
    assert.equal(await editor, 'REJECTED_RECONCILED_EDIT');
  } finally { releaseReconciler.open(); await reconcile.catch(() => {}); }
  console.log('PASS: Reconciliation row lock serializes against edit; edit detects reconciled transaction');

  console.log('RESULT: 2 database concurrency checks passed; this verifies SQL/Prisma locking, NOT authenticated HTTP APIs.');
}
(async () => {
  let failure = false;
  try { await run(); }
  catch(e) { failure = true; console.error('FAIL:', e?.message || String(e)); }
  finally {
    try {
      await cleanup();
      const stillThere = await db.supplier.findFirst({where: {name: nonce}, select: {id: true}});
      assert.equal(stillThere, null);
      console.log('PASS: Temporary development fixture removed');
    } catch(e) {
      failure = true;
      console.error('CLEANUP FAILED: temporary fixture prefix:', nonce);
      console.error(e?.message || String(e));
    }
    await db.$disconnect();
    if (failure) process.exitCode = 1;
  }
})();
