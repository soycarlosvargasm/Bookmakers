import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { mkdir, writeFile, stat, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createUiServer } from "./server.js";
import { installCountryPagesBundle } from "./country-pages-bundle.js";
import { installMacAppIcon } from "./mac-icon.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(root);
const args = process.argv.slice(2);
let port = 3000;
let serverOnly = false;
for (let i=0; i<args.length; i++) {
  if (args[i] === "--server-only") serverOnly = true;
  else if (args[i] === "--port" && args[i+1]) port = Number(args[++i]);
  else throw new Error("Usage: npm run ui -- [--port N]");
}
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("Port must be between 1 and 65535");
let closing = false;
const close = async () => { if (closing) return; closing = true; await server.close(); process.exit(0); };
const nativeAccessPath = resolve(".engine/ui/native-access.json");
await mkdir(dirname(nativeAccessPath), { recursive: true });
let nativeToken: string;
try { nativeToken = JSON.parse(await readFile(nativeAccessPath, "utf8")).token; if (typeof nativeToken !== "string" || nativeToken.length < 32) throw new Error("Invalid native access token"); }
catch { nativeToken = randomUUID(); await writeFile(nativeAccessPath, JSON.stringify({ token: nativeToken }), { mode: 0o600 }); }
const server = await createUiServer({ nativeToken, port, manageDatabase: true, ingestSnapshots: true, onCloseRequest: () => { void close(); } });
process.once("SIGINT", () => { void close(); });
process.once("SIGTERM", () => { void close(); });
console.log(`Sportsbook Collector: ${await server.listen()}`);
if (process.platform === "darwin" && !serverOnly) {
  try {
    const appPath = resolve("dist/ui-macos/Sportsbook Collector.app");
    const contents = join(appPath,"Contents"), source=resolve("src/ui/mac-app.swift");
    const executable = join(contents,"MacOS/SportsbookCollector");
    await mkdir(join(contents,"MacOS"),{recursive:true}); await mkdir(join(contents,"Resources"),{recursive:true});
    const hasIcon = await installMacAppIcon(root, join(contents, "Resources"));
    await installCountryPagesBundle(root,join(contents,"Resources"));
    await writeFile(join(contents,"Info.plist"),`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>CFBundleExecutable</key><string>SportsbookCollector</string><key>CFBundleIdentifier</key><string>com.sportsbookcollector.local</string><key>CFBundleName</key><string>Sportsbook Collector</string><key>CFBundlePackageType</key><string>APPL</string>${hasIcon ? '<key>CFBundleIconFile</key><string>AppIcon.icns</string>' : ''}<key>NSHighResolutionCapable</key><true/><key>NSDesktopFolderUsageDescription</key><string>Sportsbook Collector reads this project and its real engine data from your Desktop.</string><key>NSAppleEventsUsageDescription</key><string>Sportsbook Collector uses Chrome Renzo to read the sports pages you run.</string><key>LSMinimumSystemVersion</key><string>12.0</string></dict></plist>`);
    await writeFile(join(contents,"Resources/launch.json"),JSON.stringify({root,projectRoot:root,node:process.execPath,port}));
    const binary = await stat(executable).catch(()=>null);
    if (!binary || binary.mtimeMs < (await stat(source)).mtimeMs) {
      console.log("Building macOS application…");
      const nextExecutable = `${executable}.new-${randomUUID()}`;
      try {
        await promisify(execFile)("swiftc",[source,"-o",nextExecutable]);
        await rename(nextExecutable,executable);
      } finally { await rm(nextExecutable,{force:true}); }
    }
    if (!closing) await promisify(execFile)("open",[appPath,"--args",`http://127.0.0.1:${port}`]);
  } catch(error) { console.error("Could not launch the macOS application:",error); await close(); }
}
