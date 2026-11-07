from app.modulos.acessibilidade.adaptacao import build_adaptation
from app.modulos.acessibilidade.schemas import PerfilChatIn as ProfileIn


def test_baixa_escolaridade_idoso_visual():
    a = build_adaptation(
        ProfileIn(escolaridade="fundamental_incompleto", faixa_etaria="60_mais", deficiencias=["visual"])
    )
    assert "frases curtas" in a.prompt_instructions
    assert "emojis" in a.prompt_instructions
    assert "um passo de cada vez" in a.prompt_instructions
    assert a.use_audio is True
    assert a.ui_prefs.auto_play_audio is True
    assert a.ui_prefs.high_contrast is True
    assert a.ui_prefs.font_scale >= 1.5


def test_surdez_nunca_toca_audio_sozinho_e_ativa_vlibras():
    a = build_adaptation(
        ProfileIn(
            escolaridade="superior_completo", faixa_etaria="30_59",
            deficiencias=["auditiva"], prefere_audio=True,
        )
    )
    assert a.ui_prefs.vlibras is True
    assert a.ui_prefs.auto_play_audio is False
    assert "nunca dependa de áudio" in a.prompt_instructions


def test_tea_linguagem_literal_uma_pergunta():
    a = build_adaptation(ProfileIn(escolaridade="medio_completo", faixa_etaria="18_29", deficiencias=["tea"]))
    assert "literal" in a.prompt_instructions
    assert "UMA pergunta" in a.prompt_instructions
    assert a.use_audio is False


def test_motora_prioriza_botoes():
    a = build_adaptation(ProfileIn(escolaridade="pos_graduacao", faixa_etaria="30_59", deficiencias=["motora"]))
    assert "oferecer_opcoes" in a.prompt_instructions
