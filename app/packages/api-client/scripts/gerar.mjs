// Gera src/schema.d.ts a partir do OpenAPI do backend (a fonte da verdade do contrato).
// Uso (na pasta app/): npm run gen:api
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
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

// Usa o uv quando existir; senão, o Python do backend/.venv (criado pelo iniciar.ps1/iniciar.sh).
const opcoes = { cwd: backend, encoding: "utf8", env: { ...process.env, DATABASE_URL: "sqlite:///:memory:" } };
const venv = resolve(backend, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
let json;
try {
  json = execFileSync("uv", ["run", "python", "-c", PYTHON], opcoes);
} catch (e) {
  if (e.code !== "ENOENT" || !existsSync(venv)) throw e;
  json = execFileSync(venv, ["-c", PYTHON], opcoes);
}
const pasta = mkdtempSync(join(tmpdir(), "uhealth-openapi-"));
const arquivo = join(pasta, "openapi.json");
writeFileSync(arquivo, json);
try {
  // No Windows o npx é um .cmd: só roda com shell (caminhos entre aspas por causa de espaços).
  const win = process.platform === "win32";
  const q = (s) => (win ? `"${s}"` : s);
  execFileSync("npx", ["openapi-typescript", q(arquivo), "-o", q(saida)], { stdio: "inherit", shell: win });
} finally {
  rmSync(pasta, { recursive: true, force: true });
}
console.log(`Tipos gerados em ${saida}`);
