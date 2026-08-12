import app from "../artifacts/api-server/src/app";
import { ensureSupabaseAuthUsers } from "../artifacts/api-server/src/utils/seedAuth";
import { seedComprehensiveEnterpriseData } from "../artifacts/api-server/src/utils/seedComprehensiveData";

let isInitializing = false;

if (!isInitializing) {
  isInitializing = true;
  ensureSupabaseAuthUsers()
    .then(() => seedComprehensiveEnterpriseData())
    .catch((err) => {
      console.error("Vercel cold-start initialization warning:", err);
    });
}

export default app;
