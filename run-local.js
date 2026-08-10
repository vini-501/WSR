import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load env variables from .env
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split(/\r?\n/).forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    const firstEqual = line.indexOf("=");
    if (firstEqual === -1) return;
    const key = line.substring(0, firstEqual).trim();
    let val = line.substring(firstEqual + 1).trim();
    // remove quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  });
  console.log("Loaded environment variables from .env");
} else {
  console.warn("Warning: .env file not found at " + envPath);
}

// 2. Helper to log from child processes
function logProcess(name, stream, prefix) {
  stream.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`[${name}] ${line}`);
      }
    });
  });
}

// 3. Start API Server (Port 5000)
console.log("Starting API Server...");
const envWithVolta = {
  ...process.env,
  PATH: `C:\\Program Files\\Volta;${process.env.PATH || ""}`,
  CI: "true",
};
const serverEnv = {
  ...envWithVolta,
  PORT: "5000",
  NODE_ENV: "development",
};
const serverProc = spawn("pnpm", ["--filter", "@workspace/api-server", "run", "dev"], {
  cwd: __dirname,
  env: serverEnv,
  shell: true,
});

logProcess("Server-Out", serverProc.stdout);
logProcess("Server-Err", serverProc.stderr);

serverProc.on("close", (code) => {
  console.log(`[Server] Process exited with code ${code}`);
});

// 4. Start Frontend (Port 3000)
console.log("Starting Frontend...");
const frontendEnv = {
  ...envWithVolta,
  PORT: "3000",
  BASE_PATH: "/",
};
const frontendProc = spawn("pnpm", ["--filter", "@workspace/opshub", "run", "dev"], {
  cwd: __dirname,
  env: frontendEnv,
  shell: true,
});

logProcess("Frontend-Out", frontendProc.stdout);
logProcess("Frontend-Err", frontendProc.stderr);

frontendProc.on("close", (code) => {
  console.log(`[Frontend] Process exited with code ${code}`);
});

// Handle termination
process.on("SIGINT", () => {
  console.log("\nTerminating child processes...");
  serverProc.kill("SIGINT");
  frontendProc.kill("SIGINT");
  process.exit();
});
