import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);

export async function installMacAppIcon(root: string, resources: string): Promise<boolean> {
  const candidates = ["logo.png", "App logo.PNG"];
  let logo: string | undefined;
  for (const name of candidates) {
    const path = join(root, name);
    if ((await stat(path).catch(() => null))?.isFile()) { logo = path; break; }
  }
  if (!logo) return false;
  const backgroundSource = join(root, "src/ui/icon-background.swift");
  const icon = join(resources, "AppIcon.icns");
  const existing = await stat(icon).catch(() => null);
  if (existing && existing.mtimeMs >= Math.max((await stat(logo)).mtimeMs, (await stat(backgroundSource)).mtimeMs)) return true;
  await mkdir(resources, { recursive: true });
  const temporary = await mkdtemp(join(tmpdir(), "sportsbook-icon-"));
  try {
    const iconset = join(temporary, "AppIcon.iconset");
    await mkdir(iconset);
    const whiteLogo = join(temporary, "logo-white.png");
    await exec("swift", [backgroundSource, logo, whiteLogo]);
    await Promise.all([16, 32, 128, 256, 512].flatMap(size => [1, 2].map(async scale => {
      const pixels = String(size * scale);
      const file = `icon_${size}x${size}${scale === 2 ? "@2x" : ""}.png`;
      await exec("sips", ["-z", pixels, pixels, whiteLogo, "--out", join(iconset, file)]);
    })));
    await exec("iconutil", ["-c", "icns", iconset, "-o", icon]);
    return true;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
