from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.db import get_db

router = APIRouter(tags=["saúde"])


@router.get("/saude")
def saude(db: Session = Depends(get_db)):
    db.execute(text("select 1"))
    return {"status": "ok", "banco": "ok", "modo": "demo" if get_settings().demo_mode else "producao"}
