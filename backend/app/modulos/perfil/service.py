from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import acesso_negado
from app.core.time import to_sp_iso, utc_now
from app.modulos.perfil.models import PerfilUsuario
from app.modulos.perfil.schemas import FINALIDADE_RENDA, PerfilIn


def exigir_paciente(actor: Actor) -> None:
    if actor.papel != "paciente":
        raise acesso_negado("O perfil é só para pacientes.")


def perfil_json(usuario_id: str, p: PerfilUsuario | None) -> dict:
    """Perfil salvo ou o padrão (nada salvo ainda). Renda não informada é válida."""
    socio = dict((p.socioeconomico if p else None) or {"informado": False, "prefiro_nao_informar": False})
    if socio.get("informado"):
        socio["finalidade"] = FINALIDADE_RENDA
    acess = (p.acessibilidade if p else None) or {"texto": "normal", "linguagem": "simples", "audio": False,
                                                 "tema": "sistema"}
    return {"usuario_id": usuario_id, "cidade": p.cidade if p else None, "uf": p.uf if p else None,
            "contato_preferido": p.contato_preferido if p else None, "socioeconomico": socio,
            "acessibilidade": acess, "atualizado_em": to_sp_iso(p.atualizado_em) if p else None,
            "salvo": p is not None}


def obter(db: Session, actor: Actor) -> dict:
    exigir_paciente(actor)
    return perfil_json(actor.usuario_id, db.get(PerfilUsuario, actor.usuario_id))


def salvar(db: Session, actor: Actor, dados: PerfilIn) -> dict:
    exigir_paciente(actor)
    p = db.get(PerfilUsuario, actor.usuario_id) or PerfilUsuario(usuario_id=actor.usuario_id)
    p.cidade = dados.cidade.strip() if dados.cidade else None
    p.uf = dados.uf.upper() if dados.uf else None
    p.contato_preferido = dados.contato_preferido
    p.socioeconomico = dados.socioeconomico.model_dump(exclude_none=True)
    p.acessibilidade = dados.acessibilidade.model_dump()
    p.atualizado_em = utc_now()
    db.add(p)
    db.flush()
    return perfil_json(actor.usuario_id, p)


def faixa_renda(db: Session, paciente_id: str) -> str | None:
    """Para a fila (#13): faixa só se a pessoa informou; senão None (vale 0, documentado no contrato)."""
    p = db.get(PerfilUsuario, paciente_id)
    socio = (p.socioeconomico if p else None) or {}
    return socio.get("faixa_renda_familiar") if socio.get("informado") else None
