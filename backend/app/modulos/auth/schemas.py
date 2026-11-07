from pydantic import BaseModel


class LoginIn(BaseModel):
    conta: str
