import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const till = "#1C1A16";
const cream = "#F4EDE3";
const starSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="${cream}" d="M12 1.4 14.7 9.3 22.6 12 14.7 14.7 12 22.6 9.3 14.7 1.4 12 9.3 9.3 12 1.4Z"/>
</svg>`);

const webDir = join(root, "public/icons");
await mkdir(webDir, { recursive: true });

async function starOnTill(size, inset = 0.22) {
  const starSize = Math.round(size * (1 - inset * 2));
  const even = starSize - (starSize % 2);
  const star = await sharp(starSvg).resize(even, even).png().toBuffer();
  const origin = Math.round((size - even) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: till },
  })
    .composite([{ input: star, left: origin, top: origin }])
    .png()
    .toBuffer();
}

async function starForeground(size) {
  const starSize = Math.round(size * 0.36);
  const even = starSize - (starSize % 2);
  const star = await sharp(starSvg).resize(even, even).png().toBuffer();
  const origin = Math.round((size - even) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: star, left: origin, top: origin }])
    .png()
    .toBuffer();
}

await writeFile(join(webDir, "apple-touch-icon.png"), await starOnTill(180));
await writeFile(join(webDir, "icon-192.png"), await starOnTill(192));
await writeFile(join(webDir, "icon-512.png"), await starOnTill(512));
await writeFile(join(webDir, "icon-maskable-512.png"), await starOnTill(512, 0.18));

const androidRes = join(root, "android/app/src/main/res");
const launcher = [
  ["mipmap-mdpi", 48, 108],
  ["mipmap-hdpi", 72, 162],
  ["mipmap-xhdpi", 96, 216],
  ["mipmap-xxhdpi", 144, 324],
  ["mipmap-xxxhdpi", 192, 432],
];

for (const [folder, launcherSize, foregroundSize] of launcher) {
  const dir = join(androidRes, folder);
  await mkdir(dir, { recursive: true });
  const icon = await starOnTill(launcherSize, 0.2);
  await writeFile(join(dir, "ic_launcher.png"), icon);
  await writeFile(join(dir, "ic_launcher_round.png"), icon);
  await writeFile(join(dir, "ic_launcher_foreground.png"), await starForeground(foregroundSize));
}

const splashStarSize = 420;
const splashStar = await sharp(starSvg).resize(splashStarSize, splashStarSize).png().toBuffer();
const splash = await sharp({
  create: { width: 1284, height: 2778, channels: 4, background: till },
})
  .composite([
    {
      input: splashStar,
      left: Math.round((1284 - splashStarSize) / 2),
      top: Math.round((2778 - splashStarSize) / 2),
    },
  ])
  .png()
  .toBuffer();

const splashDirs = [
  "drawable",
  "drawable-land-hdpi",
  "drawable-land-mdpi",
  "drawable-land-xhdpi",
  "drawable-land-xxhdpi",
  "drawable-land-xxxhdpi",
  "drawable-port-hdpi",
  "drawable-port-mdpi",
  "drawable-port-xhdpi",
  "drawable-port-xxhdpi",
  "drawable-port-xxxhdpi",
];
for (const folder of splashDirs) {
  const dir = join(androidRes, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "splash.png"), splash);
}

console.log("Wrote web and Android icons.");
