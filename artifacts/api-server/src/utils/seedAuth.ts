import { supabaseAdmin, seedDemoAccounts } from "../middlewares/auth";
import { db, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function ensureSupabaseAuthUsers() {
  console.log("Ensuring Supabase Auth accounts exist for core demo roles...");

  // First seed DB employees table
  await seedDemoAccounts();

  const userCredentials = [
    { email: "admin@ellipsonic.com", role: "admin", name: "Enterprise Admin" },
    { email: "management@ellipsonic.com", role: "management", name: "Executive Manager" },
    { email: "head@ellipsonic.com", role: "department_head", name: "Sarah Jenkins (Engineering Head)" },
    { email: "employee@ellipsonic.com", role: "employee", name: "Alex Rivera (Senior Engineer)" },
  ];

  const defaultPassword = "Ellipsonic@2026!";

  for (const item of userCredentials) {
    try {
      const { data: listRes } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listRes?.users?.find((u: { email?: string }) => u.email === item.email);

      let authUserId: string;

      if (!existingUser) {
        console.log(`Creating Supabase Auth user: ${item.email}...`);
        const { data: newAuthUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: item.email,
          password: defaultPassword,
          email_confirm: true,
          user_metadata: { name: item.name, role: item.role },
        });

        if (error || !newAuthUser.user) {
          console.error(`Failed to create Auth user for ${item.email}:`, error?.message);
          continue;
        }

        authUserId = newAuthUser.user.id;
      } else {
        authUserId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password: defaultPassword,
          email_confirm: true,
        });
      }

      await db
        .update(employeesTable)
        .set({ auth_user_id: authUserId, updated_at: new Date() })
        .where(eq(employeesTable.email, item.email));

      console.log(`✓ Configured ${item.email} with auth_user_id: ${authUserId}`);
    } catch (err: any) {
      console.error(`Error configuring Supabase user ${item.email}:`, err?.message || err);
    }
  }

  console.log("Supabase Auth users configuration completed.");
}
