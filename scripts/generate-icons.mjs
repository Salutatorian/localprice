import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public/icons/icon.svg");
const outDir = join(root, "public/icons");
const svg = await readFile(svgPath);

await mkdir(outDir, { recursive: true });

async function png(size, file, { padded = false } = {}) {
  const image = padded
    ? await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: "#0F5C57",
        },
      })
        .composite([
          {
            input: await sharp(svg)
              .resize(Math.round(size * 0.78))
              .png()
              .toBuffer(),
          },
        ])
        .png()
        .toBuffer()
    : await sharp(svg).resize(size, size).png().toBuffer();
  await writeFile(join(outDir, file), image);
}

await png(180, "apple-touch-icon.png");
await png(192, "icon-192.png");
await png(512, "icon-512.png");
await png(512, "icon-maskable-512.png", { padded: true });
