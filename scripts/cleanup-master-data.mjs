import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_ADMIN_ID =
  "cmmkl2v850000uln85usmqv0u";

const KEEP_EKSELANS_ID =
  "cmt1c9itn0000jr04xy2lqdp9";

const KEEP_INVOICE_ID =
  "cmt38trr50001jr04zx8r66hr";

const KEEP_INVOICE_NUMBER =
  "0000000005";

async function main() {
  console.log("");
  console.log(
    "======================================================"
  );
  console.log(
    "EPOCH JOURNEYS - MASTER DATA CLEANUP"
  );
  console.log(
    "======================================================"
  );

  console.log("");
  console.log("PRESERVING:");
  console.log("ADMIN account");
  console.log("EKSELANS TURİZM agent");
  console.log(
    `Invoice ${KEEP_INVOICE_NUMBER}`
  );
  console.log("");

  // ======================================================
  // SAFETY CHECKS
  // ======================================================

  const admin =
    await prisma.user.findUnique({
      where: {
        id: KEEP_ADMIN_ID,
      },
      select: {
        id: true,
        role: true,
        email: true,
      },
    });

  if (
    !admin ||
    admin.role !== "ADMIN"
  ) {
    throw new Error(
      "STOPPED: Expected ADMIN account was not found."
    );
  }

  const ekselans =
    await prisma.user.findUnique({
      where: {
        id: KEEP_EKSELANS_ID,
      },
      select: {
        id: true,
        role: true,
        travelAgency: true,
        billingCompanyName: true,
      },
    });

  if (
    !ekselans ||
    ekselans.travelAgency !==
      "EKSELANS TURİZM"
  ) {
    throw new Error(
      "STOPPED: EKSELANS agent was not found."
    );
  }

  const invoice =
    await prisma.salesDocument.findUnique({
      where: {
        id: KEEP_INVOICE_ID,
      },
      include: {
        items: true,
      },
    });

  if (
    !invoice ||
    invoice.documentNumber !==
      KEEP_INVOICE_NUMBER
  ) {
    throw new Error(
      "STOPPED: Invoice 0000000005 was not found."
    );
  }

  console.log(
    "Safety checks passed."
  );
  console.log("");

  // ======================================================
  // CLEANUP
  // ======================================================

  const result =
    await prisma.$transaction(
      async (tx) => {
        const deleted = {};

        // ==================================================
        // SUPPLIER CHILD DATA
        // ==================================================

        deleted.supplierRate =
          await tx.supplierRate.deleteMany();

        deleted.supplierService =
          await tx.supplierService.deleteMany();

        deleted.supplierContact =
          await tx.supplierContact.deleteMany();

        deleted.supplierContract =
          await tx.supplierContract.deleteMany();

        // ==================================================
        // SUPPLIERS
        // ==================================================

        deleted.supplier =
          await tx.supplier.deleteMany();

        // ==================================================
        // TOUR-RELATED DATA
        //
        // Delete optional child/master setup records first.
        // ==================================================

        deleted.tourSeasonalPrice =
          await tx.tourSeasonalPrice.deleteMany();

        deleted.pricingTier =
          await tx.pricingTier.deleteMany();

        /*
         * These models may or may not contain rows.
         * They are part of the tour setup structure.
         */

        if (tx.privateGroupSeason) {
          deleted.privateGroupSeason =
            await tx.privateGroupSeason.deleteMany();
        }

        if (tx.privateGroupPricingPlan) {
          deleted.privateGroupPricingPlan =
            await tx.privateGroupPricingPlan.deleteMany();
        }

        if (tx.partnerTourAlias) {
          deleted.partnerTourAlias =
            await tx.partnerTourAlias.deleteMany();
        }

        if (tx.departureDate) {
          deleted.departureDate =
            await tx.departureDate.deleteMany();
        }

        if (tx.resource) {
          deleted.resource =
            await tx.resource.deleteMany({
              where: {
                tourId: {
                  not: null,
                },
              },
            });
        }

        // ==================================================
        // TOURS
        // ==================================================

        deleted.tour =
          await tx.tour.deleteMany();

        // ==================================================
        // USERS
        //
        // Preserve:
        // 1. ADMIN
        // 2. EKSELANS
        //
        // Delete all other users including Test Staff.
        // ==================================================

        deleted.user =
          await tx.user.deleteMany({
            where: {
              id: {
                notIn: [
                  KEEP_ADMIN_ID,
                  KEEP_EKSELANS_ID,
                ],
              },
            },
          });

        return deleted;
      },
      {
        maxWait: 10000,
        timeout: 60000,
      }
    );

  // ======================================================
  // VERIFY PRESERVED RECORDS
  // ======================================================

  const verifyAdmin =
    await prisma.user.findUnique({
      where: {
        id: KEEP_ADMIN_ID,
      },
    });

  const verifyEks =
    await prisma.user.findUnique({
      where: {
        id: KEEP_EKSELANS_ID,
      },
    });

  const verifyInvoice =
    await prisma.salesDocument.findUnique({
      where: {
        id: KEEP_INVOICE_ID,
      },
      include: {
        items: true,
      },
    });

  if (!verifyAdmin) {
    throw new Error(
      "CRITICAL: ADMIN account is missing after cleanup."
    );
  }

  if (!verifyEks) {
    throw new Error(
      "CRITICAL: EKSELANS is missing after cleanup."
    );
  }

  if (!verifyInvoice) {
    throw new Error(
      "CRITICAL: Invoice 0000000005 is missing after cleanup."
    );
  }

  // ======================================================
  // RESULTS
  // ======================================================

  console.log(
    "======================================================"
  );
  console.log(
    "DELETED MASTER / TEST DATA"
  );
  console.log(
    "======================================================"
  );

  let total = 0;

  for (
    const [name, value]
    of Object.entries(result)
  ) {
    const count =
      value?.count ?? 0;

    total += count;

    console.log(
      `${name.padEnd(30)} ${count}`
    );
  }

  console.log("");
  console.log(
    `TOTAL DELETED: ${total}`
  );

  console.log("");
  console.log(
    "======================================================"
  );
  console.log(
    "PRESERVED"
  );
  console.log(
    "======================================================"
  );

  console.log(
    `ADMIN: ${verifyAdmin.email}`
  );

  console.log(
    `AGENT: ${verifyEks.travelAgency}`
  );

  console.log(
    `INVOICE: ${verifyInvoice.documentNumber}`
  );

  console.log(
    `INVOICE ITEMS: ${verifyInvoice.items.length}`
  );

  console.log("");
  console.log(
    "Master cleanup completed successfully."
  );
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "MASTER CLEANUP FAILED"
    );
    console.error(error);

    console.error("");
    console.error(
      "If the error occurred inside the transaction, the cleanup was rolled back."
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });