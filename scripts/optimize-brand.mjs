import sharp from "sharp";
import { stat } from "node:fs/promises";
const source = "public/brand/personax-logo.svg";
const target = "public/brand/soulx-logo.webp";
await sharp(source).resize(256, 256, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toFile(target);
console.log(JSON.stringify({ sourceBytes: (await stat(source)).size, optimizedBytes: (await stat(target)).size }));
