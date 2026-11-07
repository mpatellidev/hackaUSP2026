from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    conta: str = Field(min_length=1, max_length=80)
    senha: str = Field(min_length=1, max_length=120)


class LoginDemoIn(BaseModel):
    conta: str = Field(min_length=1, max_length=80)
