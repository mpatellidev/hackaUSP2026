// Gera src/schema.d.ts a partir do OpenAPI do backend (a fonte da verdade do contrato).
// Uso (na pasta app/): npm run gen:api
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Os caminhos saem SEM o prefixo /api/v1: o cliente usa baseUrl "/api/v1" (mesma origem).
const PYTHON = [
  "import json",
  "from app.main import app",
  "o = app.openapi()",
  "o['paths'] = {k.removeprefix('/api/v1'): v for k, v in o['paths'].items() if k.startswith('/api/v1')}",
  "print(json.dumps(o))",
].join("; ");

const aqui = dirname(fileURLToPath(import.meta.url));
const backend = resolve(aqui, "../../../../backend");
const saida = resolve(aqui, "../src/schema.d.ts");

const json = execFileSync(
  "uv",
  ["run", "python", "-c", PYTHON],
  { cwd: backend, encoding: "utf8", env: { ...process.env, DATABASE_URL: "sqlite:///:memory:" } },
);
const pasta = mkdtempSync(join(tmpdir(), "uhealth-openapi-"));
const arquivo = join(pasta, "openapi.json");
writeFileSync(arquivo, json);
try {
  execFileSync("npx", ["openapi-typescript", arquivo, "-o", saida], { stdio: "inherit" });
} finally {
  rmSync(pasta, { recursive: true, force: true });
}
console.log(`Tipos gerados em ${saida}`);
