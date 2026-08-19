import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ResourceAudience, Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type CategorySeed = {
  name: string;
  slug: string;
  description?: string;
  audience: ResourceAudience;
  sortOrder: number;
  children?: Array<{
    name: string;
    slug: string;
    description?: string;
    sortOrder: number;
  }>;
};

const DEFAULT_CATEGORIES: CategorySeed[] = [
  {
    name: "Sales & Marketing",
    slug: "agent-sales-marketing",
    description: "Sales materials that agents can use with clients.",
    audience: ResourceAudience.AGENT,
    sortOrder: 10,
    children: [
      { name: "Brochures", slug: "agent-brochures", sortOrder: 10 },
      { name: "Flyers", slug: "agent-flyers", sortOrder: 20 },
      { name: "Sales Guides", slug: "agent-sales-guides", sortOrder: 30 },
      { name: "Social Media", slug: "agent-social-media", sortOrder: 40 },
      { name: "Logos & Brand Assets", slug: "agent-brand-assets", sortOrder: 50 },
    ],
  },
  {
    name: "Tours & Destinations",
    slug: "agent-tours-destinations",
    description: "Tour-specific and destination-specific materials.",
    audience: ResourceAudience.AGENT,
    sortOrder: 20,
    children: [
      { name: "Tour Materials", slug: "agent-tour-materials", sortOrder: 10 },
      { name: "Destination Guides", slug: "agent-destination-guides", sortOrder: 20 },
      { name: "Maps", slug: "agent-maps", sortOrder: 30 },
    ],
  },
  {
    name: "Agent Training",
    slug: "agent-training",
    description: "Training and practical guidance for travel advisors.",
    audience: ResourceAudience.AGENT,
    sortOrder: 30,
    children: [
      { name: "How to Book", slug: "agent-how-to-book", sortOrder: 10 },
      { name: "How to Request a Quote", slug: "agent-how-to-request-quote", sortOrder: 20 },
      { name: "Sales Training", slug: "agent-sales-training", sortOrder: 30 },
    ],
  },
  {
    name: "Forms & Templates",
    slug: "agent-forms-templates",
    audience: ResourceAudience.AGENT,
    sortOrder: 40,
  },
  {
    name: "Terms & Policies",
    slug: "agent-terms-policies",
    audience: ResourceAudience.AGENT,
    sortOrder: 50,
  },
  {
    name: "General Information",
    slug: "agent-general-information",
    audience: ResourceAudience.AGENT,
    sortOrder: 60,
  },
  {
    name: "Operations",
    slug: "admin-operations",
    description: "Internal operational documents and working templates.",
    audience: ResourceAudience.ADMIN,
    sortOrder: 10,
    children: [
      { name: "Rooming Lists", slug: "admin-rooming-lists", sortOrder: 10 },
      { name: "Passenger Lists", slug: "admin-passenger-lists", sortOrder: 20 },
      { name: "Supplier Information", slug: "admin-supplier-information", sortOrder: 30 },
      { name: "Operational Templates", slug: "admin-operational-templates", sortOrder: 40 },
    ],
  },
  {
    name: "Contracts & Legal",
    slug: "admin-contracts-legal",
    audience: ResourceAudience.ADMIN,
    sortOrder: 20,
  },
  {
    name: "Finance & Accounting",
    slug: "admin-finance-accounting",
    audience: ResourceAudience.ADMIN,
    sortOrder: 30,
  },
  {
    name: "Insurance & Licenses",
    slug: "admin-insurance-licenses",
    audience: ResourceAudience.ADMIN,
    sortOrder: 40,
  },
  {
    name: "Suppliers & DMCs",
    slug: "admin-suppliers-dmcs",
    audience: ResourceAudience.ADMIN,
    sortOrder: 50,
  },
  {
    name: "Company Documents",
    slug: "admin-company-documents",
    audience: ResourceAudience.ADMIN,
    sortOrder: 60,
  },
  {
    name: "Brand & Marketing",
    slug: "admin-brand-marketing",
    audience: ResourceAudience.ADMIN,
    sortOrder: 70,
  },
  {
    name: "Training & Procedures",
    slug: "admin-training-procedures",
    audience: ResourceAudience.ADMIN,
    sortOrder: 80,
  },
  {
    name: "Other",
    slug: "admin-other",
    audience: ResourceAudience.ADMIN,
    sortOrder: 90,
  },
];

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    for (const category of DEFAULT_CATEGORIES) {
      const parent = await db.resourceCategory.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description ?? null,
          audience: category.audience,
          sortOrder: category.sortOrder,
          isActive: true,
          parentId: null,
        },
        create: {
          name: category.name,
          slug: category.slug,
          description: category.description ?? null,
          audience: category.audience,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      });

      for (const child of category.children ?? []) {
        await db.resourceCategory.upsert({
          where: { slug: child.slug },
          update: {
            name: child.name,
            description: child.description ?? null,
            audience: category.audience,
            sortOrder: child.sortOrder,
            isActive: true,
            parentId: parent.id,
          },
          create: {
            name: child.name,
            slug: child.slug,
            description: child.description ?? null,
            audience: category.audience,
            sortOrder: child.sortOrder,
            isActive: true,
            parentId: parent.id,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/resources/categories/initialize error:", error);

    return NextResponse.json(
      { ok: false, error: "Could not initialize resource categories." },
      { status: 500 },
    );
  }
}
