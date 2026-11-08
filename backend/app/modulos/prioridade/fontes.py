"""Portas de entrada da fila (#13) para dados de outras frentes: perfil (#18), urgência (#14), cenários (#11).

`FontesBanco` lê pelos SERVIÇOS desses módulos (não de JSON): o que a pessoa ou o profissional alterar
na API muda a fila. Os dados continuam fictícios (`demo = True`)."""
from typing import Protocol

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modulos.cenarios import service as cenarios_service
from app.modulos.cenarios.repositorio import RepositorioCenarios
from app.modulos.perfil import service as perfil_service
from app.modulos.urgencia import service as urgencia_service
from app.modulos.urgencia.repositorio import RepositorioUrgencia


class Fontes(Protocol):
    demo: bool

    def faixa_renda(self, paciente_id: str) -> str | None: ...
    def urgencia(self, solicitacao_id: str) -> str: ...  # avaliada | autodeclarada | nenhuma
    def cenario_correspondente(self, clinica_id: str, especialidade: str) -> bool: ...


class FontesBanco:
    demo = True  # dados fictícios de demonstração

    def __init__(self, db: Session) -> None:
        self._db = db
        self._urgencia = RepositorioUrgencia(db)
        self._cenarios = RepositorioCenarios(db)

    def faixa_renda(self, paciente_id: str) -> str | None:
        return perfil_service.faixa_renda(self._db, paciente_id)

    def urgencia(self, solicitacao_id: str) -> str:
        return urgencia_service.status_urgencia(self._urgencia, solicitacao_id)

    def cenario_correspondente(self, clinica_id: str, especialidade: str) -> bool:
        return cenarios_service.cenario_correspondente(self._cenarios, clinica_id, especialidade)

    def deficiencia(self, paciente_id: str) -> bool:
        return perfil_service.tem_deficiencia(self._db, paciente_id)


def get_fontes(db: Session = Depends(get_db)) -> Fontes:
    return FontesBanco(db)
