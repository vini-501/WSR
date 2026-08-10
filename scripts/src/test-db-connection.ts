import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Connecting to the database using @workspace/db...");
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    console.log("Database connection successful!");
    console.log("Database time:", result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

main();
