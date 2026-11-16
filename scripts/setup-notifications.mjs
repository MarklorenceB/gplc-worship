import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import * as webpush from "web-push";

const filename = ".env.local";
let content = await readFile(filename, "utf8").catch(error => {
  if (error.code === "ENOENT") return "";
  throw error;
});
const has = name => new RegExp(`^${name}=.+`, "m").test(content);
function put(name, value) {
  if (has(name)) return;
  content = content.replace(new RegExp(`^${name}=.*\\n?`, "m"), "");
  content += `${content.endsWith("\n") || !content ? "" : "\n"}${name}=${value}\n`;
}
if (has("VAPID_PUBLIC_KEY") !== has("VAPID_PRIVATE_KEY")) throw new Error("Only one VAPID key is present. Restore its matching pair before continuing.");
if (!has("VAPID_PUBLIC_KEY")) {
  const keys = webpush.generateVAPIDKeys();
  put("VAPID_PUBLIC_KEY", keys.publicKey); put("VAPID_PRIVATE_KEY", keys.privateKey);
}
put("VAPID_SUBJECT", "https://github.com/MarklorenceB/gplc-worship");
put("CRON_SECRET", randomBytes(32).toString("hex"));
await writeFile(filename, content, { mode: 0o600 });
await chmod(filename, 0o600);
console.log("Notification keys saved in .env.local (existing keys preserved). Restart the dev server if needed. Copy these settings privately into Vercel; never commit this file.");
