import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const url = new URL("/api/notifications/run", process.env.APP_URL || "http://localhost:3004");
if (!process.env.CRON_SECRET) throw new Error("Run npm run notifications:setup first.");
if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Use HTTPS for a remote app.");
let stopped = false;
process.on("SIGTERM", () => { stopped = true; });
process.on("SIGINT", () => { stopped = true; process.exit(0); });
do {
  try {
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(55_000), redirect: "error" });
    console.log(`${new Date().toISOString()} notification scheduler: ${response.status}`);
  } catch { console.error("Notification scheduler could not reach the app. Retrying next minute."); }
  if (process.argv.includes("--once")) break;
  if (!stopped) await new Promise(resolve => setTimeout(resolve, 60_000));
} while (!stopped);
