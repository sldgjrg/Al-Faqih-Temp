import { rm } from "node:fs/promises";
import { join } from "node:path";

const nextDirectory = join(import.meta.dirname, "..", ".next");

await rm(nextDirectory, { recursive: true, force: true });
console.log("Cleared stale Next.js development artifacts.");
