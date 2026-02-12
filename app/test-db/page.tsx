import { db } from "@/lib/db";

export default async function TestDbPage() {
  const userCount = await db.user.count();

  return (
    <main style={{ padding: 24 }}>
      <h1>DB Test</h1>
      <p>User count: {userCount}</p>
    </main>
  );
}
