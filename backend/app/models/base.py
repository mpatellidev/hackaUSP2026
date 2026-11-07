import uuid
from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.time import utc_now


def new_id() -> str:
    return str(uuid.uuid4())


class UuidPk:
    id: Mapped[str] = mapped_column(primary_key=True, default=new_id)


class CriadoEm:
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
