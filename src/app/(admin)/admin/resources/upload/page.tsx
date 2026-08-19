import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import ResourceUploadForm from "@/components/admin/resources/ResourceUploadForm";

export default async function AdminResourceUploadPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/admin-login");
  }

  const [categories, tours] = await Promise.all([
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
      select: { id: true, title: true, tourCode: true, destinations: true },
    }),
  ]);

  return (
    <ResourceUploadForm
      categories={categories}
      tours={tours}
    />
  );
}
