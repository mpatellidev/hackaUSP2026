"""CPF: chave de interoperabilidade do paciente. Validação dos dígitos verificadores (regra da Receita Federal)."""


def so_digitos(cpf: str) -> str:
    return "".join(ch for ch in cpf if ch.isdigit())


def _digito(base: str) -> int:
    peso = len(base) + 1
    soma = sum(int(d) * (peso - i) for i, d in enumerate(base))
    resto = soma % 11
    return 0 if resto < 2 else 11 - resto


def valido(cpf: str) -> bool:
    d = so_digitos(cpf)
    if len(d) != 11 or d == d[0] * 11:  # 111.111.111-11 e afins passam na conta, mas não existem
        return False
    return _digito(d[:9]) == int(d[9]) and _digito(d[:10]) == int(d[10])


def formatar(cpf: str) -> str:
    d = so_digitos(cpf)
    return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"


def mascarar(cpf: str) -> str:
    """Mostra só os 2 últimos dígitos antes do verificador: ***.***.*12-34 (para telas e logs)."""
    d = so_digitos(cpf)
    return f"***.***.*{d[7:9]}-{d[9:]}"


def gerar_digitos(base9: str) -> str:
    """Completa 9 dígitos com os verificadores (usado nos dados fictícios e nos testes)."""
    d1 = _digito(base9)
    return base9 + str(d1) + str(_digito(base9 + str(d1)))
