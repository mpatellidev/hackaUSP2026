from sqlalchemy.orm import Session

from app.core.auth import Actor
from app.core.errors import ApiError, acesso_negado
from app.core.time import to_sp_iso, utc_now
from app.modulos.perfil.models import PerfilUsuario
from app.modulos.perfil.schemas import FINALIDADE_RENDA, PerfilIn
from app.modulos.solicitacoes.localizacao import CepNaoAtendido, origem_do_cep, so_digitos


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
    endereco = {k: getattr(p, k) if p else None for k in (
        "cep", "logradouro", "numero", "bairro", "latitude", "longitude", "preferencia_instituicao",
        "distancia_max_km", "modo_atendimento")}
    return {"usuario_id": usuario_id, "cidade": p.cidade if p else None, "uf": p.uf if p else None,
            "contato_preferido": p.contato_preferido if p else None, "socioeconomico": socio,
            "acessibilidade": acess, "atualizado_em": to_sp_iso(p.atualizado_em) if p else None,
            "salvo": p is not None, **endereco,
            "transportes": list(p.transportes or []) if p else [], "turnos": list(p.turnos or []) if p else [],
            "precisa_acessibilidade": bool(p and p.precisa_acessibilidade),
            "possui_deficiencia": p.possui_deficiencia if p else None, "tipo_deficiencia": p.tipo_deficiencia if p else None,
            "consentimento_dados_sensiveis": bool(p and p.consentimento_sensivel_em),
            "cadastro_completo": bool(p and p.cep and p.latitude is not None and p.preferencia_instituicao)}


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
    p.cep = so_digitos(dados.cep) if dados.cep else None
    p.logradouro, p.numero, p.bairro = dados.logradouro, dados.numero, dados.bairro
    p.preferencia_instituicao, p.distancia_max_km = dados.preferencia_instituicao, dados.distancia_max_km
    p.transportes, p.turnos = list(dados.transportes), list(dados.turnos)
    p.precisa_acessibilidade = dados.precisa_acessibilidade
    informou_sensivel = dados.socioeconomico.informado or dados.possui_deficiencia is not None
    if informou_sensivel and not dados.consentimento_dados_sensiveis:
        raise ApiError(422, "validacao", "Para informar renda ou deficiência, marque a autorização de uso desses dados.",
                       {"campos": ["consentimento_dados_sensiveis"]})
    if dados.consentimento_dados_sensiveis:
        p.consentimento_sensivel_em = p.consentimento_sensivel_em or utc_now()
        p.possui_deficiencia = dados.possui_deficiencia
        p.tipo_deficiencia = dados.tipo_deficiencia if dados.possui_deficiencia else None
    else:  # sem consentimento (ou retirado): nada sensível fica guardado
        p.consentimento_sensivel_em = None
        p.possui_deficiencia = p.tipo_deficiencia = None
        p.socioeconomico = {"informado": False, "prefiro_nao_informar": dados.socioeconomico.prefiro_nao_informar}
    if dados.latitude is not None and dados.longitude is not None:
        p.latitude, p.longitude = dados.latitude, dados.longitude
    elif p.cep:
        try:  # sem a localização do aparelho, o CEP vira o centro aproximado da região
            p.latitude, p.longitude, _ = origem_do_cep(p.cep)
        except CepNaoAtendido as e:
            raise ApiError(422, "validacao", str(e), {"campos": ["cep"]}) from e
    else:
        p.latitude = p.longitude = None
    p.atualizado_em = utc_now()
    db.add(p)
    db.flush()
    return perfil_json(actor.usuario_id, p)


def faixa_renda(db: Session, paciente_id: str) -> str | None:
    """Para a fila: faixa só se a pessoa informou E autorizou o uso; senão None (vale 0)."""
    p = db.get(PerfilUsuario, paciente_id)
    if p is None or p.consentimento_sensivel_em is None:
        return None
    socio = p.socioeconomico or {}
    return socio.get("faixa_renda_familiar") if socio.get("informado") else None


def tem_deficiencia(db: Session, paciente_id: str) -> bool:
    """Para a fila: só conta com consentimento explícito."""
    p = db.get(PerfilUsuario, paciente_id)
    return bool(p and p.consentimento_sensivel_em and p.possui_deficiencia)


def salvar_modo(db: Session, actor: Actor, modo: str) -> dict:
    """Só o modo de uso (assistente ou telas), sem tocar no resto do perfil."""
    exigir_paciente(actor)
    p = db.get(PerfilUsuario, actor.usuario_id) or PerfilUsuario(usuario_id=actor.usuario_id, socioeconomico={},
                                                                acessibilidade={}, transportes=[], turnos=[])
    p.modo_atendimento = modo
    p.atualizado_em = utc_now()
    db.add(p)
    db.flush()
    return perfil_json(actor.usuario_id, p)
