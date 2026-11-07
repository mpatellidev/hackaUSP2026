from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.models import Profile, User
from app.profile.adaptation import build_adaptation, describe_profile
from app.schemas import ProfileIn, ProfileOut

router = APIRouter(prefix="/me/profile", tags=["perfil"])


def _out(p: Profile) -> dict:
    data = ProfileIn.model_validate(p, from_attributes=True)
    return {
        **data.model_dump(),
        "ui_prefs": build_adaptation(data).ui_prefs,
        "resumo": describe_profile(data),
    }


class ProfileWithSummary(ProfileOut):
    resumo: str


@router.get("", response_model=ProfileWithSummary)
def get_profile(user: User = Depends(get_current_user)) -> dict:
    if not user.profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Perfil ainda não preenchido.")
    return _out(user.profile)


@router.put("", response_model=ProfileWithSummary)
def put_profile(
    body: ProfileIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    # "nenhuma"/"prefiro_nao_dizer" não fazem sentido junto com outras opções
    defs = [d for d in dict.fromkeys(body.deficiencias)]
    if len(defs) > 1:
        defs = [d for d in defs if d not in ("nenhuma", "prefiro_nao_dizer")] or defs[:1]
    p = user.profile or Profile(user_id=user.id)
    p.escolaridade = body.escolaridade
    p.faixa_etaria = body.faixa_etaria
    p.deficiencias = defs
    p.prefere_audio = body.prefere_audio
    db.add(p)
    db.commit()
    db.refresh(p)
    return _out(p)
