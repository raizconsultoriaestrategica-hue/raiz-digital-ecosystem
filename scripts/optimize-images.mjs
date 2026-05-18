#!/usr/bin/env node
/**
 * Otimiza imagens estaticas do site para WebP.
 *
 * Para cada .jpg/.png em src/assets/ que ainda nao tem versao .webp:
 *   1. Le metadados
 *   2. Se largura > MAX_WIDTH, redimensiona mantendo aspect ratio
 *   3. Converte para WebP com qualidade 82
 *   4. Salva ao lado do original com extensao .webp
 *
 * Pre-requisito (sharp nao esta fixado em devDependencies para nao poluir
 * o lockfile do build em producao):
 *   npm install --no-save sharp
 *
 * Uso:
 *   npm run optimize:images           # processa tudo que falta
 *   node scripts/optimize-images.mjs --force   # reprocessa mesmo se .webp existe
 */
import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { join, parse, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error("\nsharp nao esta instalado. Rode antes:");
  console.error("  npm install --no-save sharp\n");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "..", "src", "assets");
const MAX_WIDTH = 1600;
const QUALITY = 82;
const SOURCE_EXTS = [".jpg", ".jpeg", ".png"];
const force = process.argv.includes("--force");

const fmtKB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function processFile(filePath) {
  const { name, ext, dir } = parse(filePath);
  if (!SOURCE_EXTS.includes(ext.toLowerCase())) return null;
  if (name.startsWith("logo") || name === "simbolo") return null; // logos ficam como PNG transparente

  const outPath = join(dir, `${name}.webp`);
  try {
    const outStat = await stat(outPath);
    if (!force && outStat.size > 0) {
      return { name: `${name}${ext}`, skipped: true };
    }
  } catch {
    // .webp nao existe, vai processar
  }

  const input = await readFile(filePath);
  const inputSize = input.length;
  const meta = await sharp(input).metadata();

  let pipeline = sharp(input);
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }
  const output = await pipeline.webp({ quality: QUALITY }).toBuffer();
  await writeFile(outPath, output);

  return {
    name: `${name}${ext}`,
    width: meta.width,
    height: meta.height,
    inputSize,
    outputSize: output.length,
    reduction: ((1 - output.length / inputSize) * 100).toFixed(1),
  };
}

async function main() {
  const entries = await readdir(ASSETS_DIR);
  const results = [];
  for (const entry of entries) {
    const filePath = join(ASSETS_DIR, entry);
    const s = await stat(filePath);
    if (!s.isFile()) continue;
    const r = await processFile(filePath);
    if (r) results.push(r);
  }

  console.log("\nOtimizacao de imagens (-> WebP, qualidade", QUALITY + ")\n");
  for (const r of results) {
    if (r.skipped) {
      console.log(`  - ${r.name.padEnd(35)} pulado (.webp ja existe, use --force para reprocessar)`);
    } else {
      console.log(
        `  - ${r.name.padEnd(35)} ${r.width}x${r.height}  ${fmtKB(r.inputSize)} -> ${fmtKB(r.outputSize)}  (-${r.reduction}%)`
      );
    }
  }
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
