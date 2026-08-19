import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import ResourceEditForm from "@/components/admin/resources/ResourceEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditResourcePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const { id } = await params;

  const [resource, categories, tours] = await Promise.all([
    db.resource.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        audience: true,
        status: true,
        categoryId: true,
        tourId: true,
        destinations: true,
        tags: true,
        originalFileName: true,
        fileSize: true,
        featured: true,
      },
    }),
    db.resourceCategory.findMany({
      where: { isActive: true },
      orderBy: [{ audience: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        audience: true,
        parentId: true,
        parent: { select: { name: true } },
      },
    }),
    db.tour.findMany({
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        tourCode: true,
        destinations: true,
      },
    }),
  ]);

  if (!resource) {
    notFound();
  }

  return (
    <ResourceEditForm
      resource={resource}
      categories={categories}
      tours={tours}
    />
  );
}
