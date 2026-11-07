"""Instala as dependências do backend no Python que executa este script (o backend/.venv), sem precisar do uv.

Lê as dependências de backend/pyproject.toml (projeto + grupo dev) e só reinstala quando o arquivo muda.
Uso (chamado pelo iniciar.ps1): backend\\.venv\\Scripts\\python.exe scripts\\instalar_backend.py
"""
import hashlib
import subprocess
import sys
import tomllib
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1] / "backend"
PYPROJECT = BACKEND / "pyproject.toml"
MARCA = Path(sys.prefix) / ".uhealth-deps"  # dentro do .venv: some junto se o .venv for apagado


def main() -> int:
    conteudo = PYPROJECT.read_bytes()
    assinatura = hashlib.sha256(conteudo).hexdigest()
    if MARCA.exists() and MARCA.read_text() == assinatura:
        print("Dependências do backend já instaladas.")
        return 0
    dados = tomllib.loads(conteudo.decode("utf-8"))
    deps = dados["project"]["dependencies"] + dados.get("dependency-groups", {}).get("dev", [])
    print(f"Instalando {len(deps)} dependências do backend (pode levar alguns minutos na 1ª vez)...")
    r = subprocess.run([sys.executable, "-m", "pip", "install", "--disable-pip-version-check", "-q", *deps])
    if r.returncode != 0:
        return r.returncode
    MARCA.write_text(assinatura)
    print("Dependências do backend instaladas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
