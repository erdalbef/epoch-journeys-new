'use strict';
// Epoch Journeys - temporary development-only fixture for REAL authenticated browser/API test.
// Uses only EPOCH_FINANCE_TEST_DATABASE_URL injected by local PowerShell wrapper.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const projectRoot = 'C:\\Users\\emrev\\epoch-journeys';
const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
const { PrismaClient } = projectRequire('@prisma/client');
const connection = process.env.EPOCH_FINANCE_TEST_DATABASE_URL;
const expectedHost = 'ep-red-waterfall-ai5fcms9.c-4.us-east-1.aws.neon.tech';
const mode = String(process.argv[2] || 'status').toLowerCase();
const manifestPath = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'EpochJourneys', 'finance-http-fixture.json');
const marker = 'EPOCH_FINANCE_FINAL_HTTP_FIXTURE_';
if (!['setup', 'verify', 'cleanup', 'status'].includes(mode)) { console.error('STOP: Mode must be setup, verify, status, or cleanup.'); process.exit(2); }
if (!connection || new URL(connection).hostname !== expectedHost) { console.error('STOP: Expected DEVELOPMENT database was not selected.'); process.exit(2); }
const prisma = new PrismaClient({datasources:{db:{url:connection}}});
function fail(message) { throw new Error(message); }
function loadManifest() { if (!fs.existsSync(manifestPath)) return null; const m=JSON.parse(fs.readFileSync(manifestPath,'utf8')); if (m.host !== expectedHost || !m.name?.startsWith(marker)) fail('Unrecognized fixture manifest.'); return m; }
async function readState(m) {
  const payable = await prisma.supplierPayable.findUnique({where:{id:m.payableId},select:{id:true,title:true,currency:true,approvedAmount:true,amountPaid:true,balance:true,approvalStatus:true,paymentStatus:true,supplierId:true}});
  const payment = await prisma.supplierPayablePayment.findUnique({where:{id:m.paymentId},select:{id:true,payableId:true,amount:true,currency:true,bankAccountId:true}});
  const ledger = await prisma.bankTransaction.findUnique({where:{id:m.ledgerId},select:{id:true,supplierPayablePaymentId:true,bankAccountId:true,amount:true,currency:true,status:true,reconciledAt:true,reconciliationId:true,statementLine:{select:{id:true}},reversals:{select:{id:true}},reversalOfId:true,reversedAt:true}});
  const bank = await prisma.bankAccount.findUnique({where:{id:m.bankId},select:{id:true,name:true,currency:true}});
  const supplier = await prisma.supplier.findUnique({where:{id:m.supplierId},select:{id:true,name:true}});
  const reconciliation = await prisma.bankReconciliation.findUnique({where:{id:m.reconciliationId},select:{id:true,bankAccountId:true}});
  if (!payable || !payment || !ledger || !bank || !supplier || !reconciliation) fail('Fixture is missing a record. Stop and inspect; no cleanup attempted.');
  if (supplier.name !== m.name || payable.title !== m.name || payable.supplierId !== m.supplierId || payment.payableId !== m.payableId || ledger.supplierPayablePaymentId !== m.paymentId || ledger.bankAccountId !== m.bankId || payment.bankAccountId !== m.bankId || reconciliation.bankAccountId !== m.bankId || ledger.reconciliationId !== m.reconciliationId || !ledger.reconciledAt) fail('Fixture relationships have changed; stop and inspect.');
  return {payable,payment,ledger,bank,supplier,reconciliation};
}
function str(d) { return String(d); }
async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log('PASS: Correct Neon development database connected.');
  if (mode === 'setup') {
    if (fs.existsSync(manifestPath)) fail('A test fixture manifest already exists. Run status or cleanup; do not create duplicates.');
    const name=marker + Date.now();
    const data = await prisma.$transaction(async tx=>{
      const supplier=await tx.supplier.create({data:{name,type:'OTHER',defaultCurrency:'CHF'}});
      const bank=await tx.bankAccount.create({data:{name:name,currency:'EUR'}});
      const payable=await tx.supplierPayable.create({data:{supplierId:supplier.id,title:name,supplierNameSnapshot:name,currency:'CHF',approvedAmount:'250.00',amountPaid:'100.00',balance:'150.00',approvalStatus:'APPROVED',paymentStatus:'PARTIALLY_PAID'}});
      const payment=await tx.supplierPayablePayment.create({data:{payableId:payable.id,bankAccountId:bank.id,amount:'100.00',currency:'CHF',method:'BANK_TRANSFER',paymentDate:new Date('2026-11-14T12:00:00Z'),reference:name}});
      const reconciliation=await tx.bankReconciliation.create({data:{bankAccountId:bank.id,statementDate:new Date('2026-11-14T00:00:00Z'),statementOpeningBalance:'0.00',statementClosingBalance:'0.00',ledgerOpeningBalance:'0.00',ledgerClosingBalance:'0.00',difference:'0.00'}});
      const ledger=await tx.bankTransaction.create({data:{bankAccountId:bank.id,supplierPayablePaymentId:payment.id,type:'SUPPLIER_PAYMENT',direction:'OUT',amount:'110.00',currency:'EUR',status:'POSTED',transactionDate:new Date('2026-11-14T12:00:00Z'),reference:name,reconciliationId:reconciliation.id,reconciledAt:new Date()}});
      return {name,host:expectedHost,supplierId:supplier.id,bankId:bank.id,payableId:payable.id,paymentId:payment.id,ledgerId:ledger.id,reconciliationId:reconciliation.id};
    });
    fs.mkdirSync(path.dirname(manifestPath),{recursive:true});
    fs.writeFileSync(manifestPath,JSON.stringify(data,null,2),{flag:'wx'});
    console.log('PASS: Separate, reconciled test fixture created. Existing ZURICH and October reconciliation not changed.');
    console.log('OPEN THIS URL IN YOUR LOGGED-IN ADMIN BROWSER:');
    console.log('http://localhost:3000/admin/supplier-payables/'+encodeURIComponent(data.payableId)+'/payments/'+encodeURIComponent(data.paymentId)+'/edit');
    console.log('TRY: Change Payment Amount from CHF 100.00 to CHF 120.00; keep the test EUR bank account and EUR 110.00 debit; Save Changes.');
    console.log('EXPECTED: Error contains SUPPLIER_PAYMENT_LEDGER_LOCKED or says reconciled/locked. NO payment should be changed.');
    console.log('THEN RUN: verify.ps1 -Mode verify');
    return;
  }
  const m=loadManifest();
  if (!m) fail('No fixture manifest found. Run setup first.');
  const s=await readState(m);
  console.log('Fixture:',m.name);
  console.log('Supplier payment CHF:',str(s.payment.amount),'| Payable paid CHF:',str(s.payable.amountPaid),'| Balance CHF:',str(s.payable.balance));
  console.log('Linked bank debit EUR:',str(s.ledger.amount),'| Reconciled: YES');
  if (mode==='verify' || mode==='status') {
    const unchanged= str(s.payment.amount)==='100' && str(s.payable.amountPaid)==='100' && str(s.payable.balance)==='150' && str(s.ledger.amount)==='110' && s.payment.currency==='CHF' && s.ledger.currency==='EUR';
    if (!unchanged) fail('FAIL: Test fixture amounts changed. Reconciliation lock may not be protecting the payment. Do not deploy.');
    console.log('PASS: Reconciled payment data has not changed.');
    if(mode==='verify') console.log('NOTE: You must ALSO observe an error in the authenticated browser edit. Unchanged database alone does not prove that HTTP edit was attempted.');
    return;
  }
  if (mode==='cleanup') {
    // Strictly refuse cleanup if anything else has been attached to the fixture.
    const [payablePayments, linkedLedgerCount, docs, bankTransactionCount, recTransactionCount] = await Promise.all([
      prisma.supplierPayablePayment.count({where:{payableId:m.payableId}}),
      prisma.bankTransaction.count({where:{supplierPayablePaymentId:m.paymentId}}),
      prisma.financeDocument.count({where:{OR:[{supplierPayableId:m.payableId},{supplierPayablePaymentId:m.paymentId},{bankTransactionId:m.ledgerId}]}}),
      prisma.bankTransaction.count({where:{bankAccountId:m.bankId}}),
      prisma.bankTransaction.count({where:{reconciliationId:m.reconciliationId}}),
    ]);
    if(payablePayments!==1||linkedLedgerCount!==1||docs!==0||bankTransactionCount!==1||recTransactionCount!==1||s.ledger.statementLine||s.ledger.reversals||s.ledger.reversalOfId||s.ledger.reversedAt) fail('Fixture has extra related records. Refusing cleanup.');
    await prisma.$transaction(async tx=>{
      await tx.bankTransaction.delete({where:{id:m.ledgerId}});
      await tx.supplierPayablePayment.delete({where:{id:m.paymentId}});
      await tx.bankReconciliation.delete({where:{id:m.reconciliationId}});
      await tx.supplierPayable.delete({where:{id:m.payableId}});
      await tx.bankAccount.delete({where:{id:m.bankId}});
      await tx.supplier.delete({where:{id:m.supplierId}});
    });
    fs.unlinkSync(manifestPath);
    console.log('PASS: Only the dedicated test records deleted. ZURICH and October reconciliation untouched.');
  }
}
main().catch(e=>{console.error('FAIL:',e.message);process.exitCode=1}).finally(async()=>{await prisma.$disconnect()});
