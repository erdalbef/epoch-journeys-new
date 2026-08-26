import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("");
  console.log("======================================================");
  console.log("EPOCH JOURNEYS - MASTER DATA AUDIT");
  console.log("READ ONLY - NOTHING WILL BE DELETED");
  console.log("======================================================");

  const users = await prisma.user.findMany({
    orderBy: [
      { role: "asc" },
      { travelAgency: "asc" },
      { email: "asc" },
    ],
    select: {
      id: true,
      role: true,
      approved: true,
      email: true,
      fullName: true,
      travelAgency: true,
      billingCompanyName: true,
      agentCode: true,
    },
  });

  console.log("");
  console.log("USERS / AGENTS");
  console.log("------------------------------------------------------");

  console.table(
    users.map((user) => ({
      role: user.role,
      agency: user.travelAgency || "-",
      name: user.fullName || "-",
      email: user.email,
      company: user.billingCompanyName || "-",
      code: user.agentCode || "-",
      id: user.id,
    }))
  );

  const suppliers = await prisma.supplier.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      legalName: true,
      type: true,
      country: true,
      city: true,
      code: true,
      _count: {
        select: {
          contacts: true,
          services: true,
          rates: true,
          contracts: true,
          payables: true,
          expenses: true,
          documents: true,
        },
      },
    },
  });

  console.log("");
  console.log("SUPPLIERS");
  console.log("------------------------------------------------------");

  console.dir(suppliers, {
    depth: null,
    colors: true,
  });

  const tours = await prisma.tour.findMany({
    orderBy: {
      title: "asc",
    },
    select: {
      id: true,
      title: true,
      tourCode: true,
      category: true,
      isPublished: true,
    },
  });

  console.log("");
  console.log("TOURS");
  console.log("------------------------------------------------------");

  console.table(
    tours.map((tour) => ({
      title: tour.title,
      code: tour.tourCode || "-",
      category: tour.category,
      published: tour.isPublished,
      id: tour.id,
    }))
  );

  console.log("");
  console.log("======================================================");
  console.log("SUMMARY");
  console.log("======================================================");
  console.log(`Users: ${users.length}`);
  console.log(`Suppliers: ${suppliers.length}`);
  console.log(`Tours: ${tours.length}`);
  console.log("");
  console.log("NOTHING WAS CHANGED OR DELETED.");
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("AUDIT FAILED");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });