# Dossiê de fontes — números do pitch e da calculadora de ROI

Levantamento feito em 08/11/2026 para o pitch (`motion/slides.html`, PR #48) e para a calculadora `negocio/roi.html`.
Regra do projeto: **número sem fonte não entra**; estimativa e hipótese aparecem rotuladas.

**Níveis de verificação**

| Nível | O que quer dizer |
|---|---|
| **Primária** | Lemos o texto original (artigo, lei, base oficial) e conferimos o número nele. |
| **Primária (resumo)** | Conferimos no resumo oficial (PubMed/Europe PMC); o texto completo não foi lido. |
| **Secundária** | O número vem de um agregador ou de um texto que cita outro; não conferimos a origem. |
| **Estimativa** | Conta do time a partir de fontes; os passos estão descritos aqui. |
| **Não verificado** | Procuramos e não achamos a origem. Não usar como fato. |

---

## Resumo para quem tem pressa

| Número no deck hoje | Situação | O que fazer |
|---|---|---|
| **117,5 dias** de espera para tratamento odontológico ("BMC Public Health, 2025") | ❌ **Fonte não é sobre o Brasil nem sobre fila do SUS.** É a mediana de atraso, desde o primeiro sintoma até a primeira consulta, de crianças em idade pré-escolar com cárie em Shenyang, na China. | **Tirar do slide.** Usar a mediana de espera dos CEOs (5 a 30 dias, conforme a especialidade) ou não usar número. Ver §5. |
| **20–35%** de faltas na odontologia da atenção básica ("BMC Public Health 2025; Holtzman et al. 2013") | ⚠️ **Nenhuma das duas fontes traz esse intervalo.** O artigo do BMC Public Health 2025 não fala de faltas. Holtzman foi publicado na *Community Dentistry and Oral Epidemiology* (não no *J. Public Health Dentistry*) e trata de uma clínica universitária dos EUA. | Trocar por **27,7%** (pacientes de CEO que faltaram a pelo menos uma consulta, Brasil, 2018). Ver §1. |
| **R$ 91 mil/ano** (2 recepcionistas) | 🟡 **Plausível como estimativa, mas no teto.** Dá R$ 3.790/mês por pessoa com encargos; nossa conta dá de R$ 2.650 a R$ 3.900, dependendo do regime tributário. | Manter rotulado como "estimativa do time"; na banca, mostrar a faixa. Ver §4. |
| Portaria GM/MS nº 90/2023 no slide de escala pública | 🟡 **A portaria não cita odontologia.** O escopo é cirurgia eletiva, exame complementar e consulta especializada no SUS. | Dizer "alinhado ao programa federal de redução de filas", **sem afirmar** que ele financia odontologia. Ver §6. |
| **66%** (Revista da ABENO), fora do escopo deste pedido | ❓ **Não achamos o artigo.** | Achar o DOI antes da final ou tirar do slide. Ver §8. |

---

## 1. Absenteísmo (faltas) em consulta odontológica

### 1.1 O que o deck cita, conferido

**a) "BMC Public Health, 2025".** O único artigo do BMC Public Health de 2025 que traz o número 117,5 dias é:

> Huang J, Sun J, Ji Y, Chen C, Yang Z, Zhao H. *Analysis of factors influencing delayed treatment seeking for dental caries in preschool children: a cross-sectional study.* **BMC Public Health** 2025;25:1669. doi:[10.1186/s12889-025-22936-5](https://doi.org/10.1186/s12889-025-22936-5) · [texto completo (PMC12054309)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12054309/)

- Local: Hospital Estomatológico da China Medical University, em Shenyang, na China. Amostra: 264 crianças em idade pré-escolar.
- **Não mede faltas** e não traz nenhum número entre 20% e 35% sobre comparecimento. Nível: **Primária**.

**b) "Holtzman et al., J. Public Health Dentistry, 2013".** A referência correta é:

> Holtzman JS, Atchison KA, Gironda MW, Radbod R, Gornbein J. *The association between oral health literacy and failed appointments in adults attending a university-based general dental clinic.* **Community Dentistry and Oral Epidemiology** 2014;42(3):263–270 (online em 24/12/2013). doi:[10.1111/cdoe.12089](https://doi.org/10.1111/cdoe.12089) · [PMC4024362](https://pmc.ncbi.nlm.nih.gov/articles/PMC4024362)

- Local: clínica de adultos da Faculdade de Odontologia da UCLA, nos **EUA**, entre 2005 e 2006. Amostra: 200 adultos na primeira consulta.
- O artigo não dá uma taxa geral. Pelas contagens do próprio artigo, **67 de 200 (33,5%)** faltaram a pelo menos uma consulta em 6 meses; tirando os 39 sem retorno marcado, foram 67 de 161 (41,6%). A conta é nossa.
- Mede **pessoas que faltaram pelo menos uma vez**, e não a porcentagem de consultas perdidas. Nível: **Primária**, com taxa calculada por nós.
- Interessa porque é uma **clínica-escola**, mas é dos EUA. Não serve como número do Brasil.

**Conclusão:** o intervalo "20–35%" **não está em nenhuma das duas fontes**. Também não é "atenção básica": Holtzman é clínica universitária, e o artigo chinês não trata de faltas.

### 1.2 Números brasileiros que podem substituir o intervalo

| Número | O que mede | Fonte | Nível |
|---|---|---|---|
| **27,7%** (IC95% 26,8–28,5) | Usuários adultos de **Centros de Especialidades Odontológicas (CEO)** que faltaram a **pelo menos uma** consulta agendada. 10.391 entrevistados em 1.042 CEOs, avaliação externa do PMAQ-CEO de 2018. | da Cunha IP et al. *Factors associated with the absence of Brazilians in specialized dental centers.* **BMC Oral Health** 2022;22:364. doi:[10.1186/s12903-022-02402-z](https://doi.org/10.1186/s12903-022-02402-z) · [PMC9419406](https://pmc.ncbi.nlm.nih.gov/articles/PMC9419406) | Primária |
| **28,3%** | Crianças de 0 a 12 anos que **não compareceram à primeira consulta** na atenção secundária odontológica de Curitiba, entre 2010 e 2013 (1.663 crianças, prontuário eletrônico municipal). | Gomes MAG et al. *No-shows at public secondary dental care for pediatric patients.* **Ciência & Saúde Coletiva** 2019;24(5). doi:[10.1590/1413-81232018245.19312017](https://doi.org/10.1590/1413-81232018245.19312017) | Primária (resumo) |
| **≈19,5% → ≈23,0%** | Consultas odontológicas faltadas em 12 USFs de Piracicaba (SP): 3.920 de 20.075 em 2010 e 4.062 de 17.640 em 2012. A taxa é calculada por nós a partir da Tabela 4. | Gonçalves CA et al. *Estratégias para o enfrentamento do absenteísmo em consultas odontológicas nas USF…* **Ciência & Saúde Coletiva** 2015;20(2). doi:[10.1590/1413-81232015202.00702014](https://doi.org/10.1590/1413-81232015202.00702014) | Primária, com taxa calculada por nós |
| **9,9% a 58,3%** | Faixa de prevalência de faltas em estudos com adultos e adolescentes, citada na revisão de literatura de Gomes et al. (2019). | Citado em Gomes et al. 2019 (acima) | Secundária: não conferimos os estudos de origem |

**Sugestão de texto para o slide 2:**
"**27,7%** dos pacientes dos centros de especialidade odontológica do SUS faltaram a pelo menos uma consulta. Fonte: da Cunha et al., BMC Oral Health, 2022 (dados PMAQ-CEO 2018)."
Atenção: é **porcentagem de pacientes**, e não de consultas. As 20 cadeiras com 7 vazias (35%) deixam de bater com o número. Com 27,7%, ficariam 5 ou 6 de 20 vazias.

### 1.3 Clínica-escola no Brasil

**Não achamos** estudo publicado com taxa de faltas em clínica-escola de odontologia brasileira com amostra grande. O dado mais próximo de clínica universitária é Holtzman (EUA). Por isso a calculadora pede que **a clínica digite a própria taxa**.

---

## 2. Custo de uma consulta odontológica perdida ou de material estéril desperdiçado

| Achado | Fonte | Nível |
|---|---|---|
| **Não achamos** estudo brasileiro que dê valor em reais por consulta **odontológica** faltada, nem por kit estéril aberto e não usado. | Buscas em SciELO, Europe PMC e Google Acadêmico | — |
| R$ 117,03 por consulta (todas as áreas) em UBS de uma rede municipal, em 2022, com custos diretos e indiretos divididos pelo número de atendimentos. **Não é de odontologia.** | *Custos no setor público: o custo do absenteísmo nas Unidades Básicas de Saúde.* Anais do Congresso Brasileiro de Custos, 2023. [PDF](https://anaiscbc.abcustos.org.br/anais/article/download/5090/5102/5241) | Secundária: só a metodologia serve |
| R$ 18,57 milhões desperdiçados com 1.002.719 consultas e exames especializados não realizados na Grande Vitória (ES), de 2014 a 2016. **Não é de odontologia.** | *Absenteísmo de usuários como fator de desperdício…* **Saúde em Debate**. [SciELO](https://www.scielo.br/j/sdeb/a/BYJbCp6ZBz9NCynKt3h3X3J/?format=html&lang=pt) | Secundária |

**Como usar:** na calculadora, o custo por falta **vem vazio de referência externa** e o valor inicial é **hipótese** (ver §9). A clínica deve preencher com o próprio custo: material separado, hora do professor supervisor, cadeira parada.

---

## 3. Número de cursos de odontologia (clínicas-escola) no Brasil

| Número | Fonte | Nível |
|---|---|---|
| **≈ 650 cursos** de graduação em odontologia (eram 241 dez anos antes), "segundo o Censo da Educação Superior/INEP". O texto não traz contagem por rede nem o ano exato. | OdontoDados, *Cursos de Odontologia no Brasil: o crescimento acelerado está acabando?* [link](https://odontodados.com/cursos-de-odontologia-no-brasil-o-crescimento-acelerado-esta-acabando/) | Secundária |
| **323 instituições** com odontologia em apenas **três regiões (Norte, Sudeste e Sul)**: 36 públicas (11,1%) e 287 privadas (88,9%). São 43.814 vagas anuais, 93,6% delas privadas. Dados do e-MEC de 2025. | Silva VG et al. *Panorama do ensino odontológico nas regiões Norte, Sudeste e Sul.* Anais SIIEPE/UFPel 2025. [PDF](https://anais-siiepe.ufpel.edu.br/2025/CS_04137.pdf) | Primária para as 3 regiões; **não é o total nacional** |
| No Censo 2024, 74,9% de **todos** os cursos superiores eram privados (média geral, não só odontologia). | INEP, *Resumo técnico do Censo da Educação Superior 2024* | Secundária: o site do INEP não abriu daqui (erro de certificado) |

**Não verificado:** o total nacional de cursos de odontologia **por rede**. Os downloads do INEP (Sinopse Estatística e apresentações do Censo) falharam por erro de certificado TLS no servidor `download.inep.gov.br`.
**Como fechar o número:** abrir [emec.mec.gov.br](https://emec.mec.gov.br), em Consulta Avançada → Curso "Odontologia" → situação "Em atividade", e exportar a planilha, que separa pública de privada. Ou usar a *Sinopse Estatística da Educação Superior 2024* do INEP, aba de cursos por área.
**Frase segura para o pitch:** "a grande maioria dos cursos de odontologia é privada (89% no Norte, Sudeste e Sul, segundo o e-MEC 2025)".

---

## 4. Custo de recepcionista em São Paulo (para conferir "R$ 91 mil/ano por 2 recepcionistas")

**Salário base:**

| Número | Fonte | Nível |
|---|---|---|
| **R$ 2.050,31/mês**: salário médio de admissão de *Recepcionista de consultório médico ou dentário* (CBO 4221-10) na cidade de São Paulo, 42 h/semana. Base Novo CAGED dos últimos 12 meses, atualizada em 05/11/2026. Só salário de carteira, sem adicionais. | Salario.com.br. [link](https://www.salario.com.br/profissao/recepcionista-de-consultorio-medico-ou-dentario-cbo-422110/sao-paulo-sp/) | Secundária: agregador dos dados do MTE |
| Não achamos convenção coletiva específica de clínica odontológica em SP para 2026. O piso real é o da convenção do sindicato que cobre a clínica-escola, que pode ser o de ensino. | — | Não verificado |

**Encargos (estimativa do time, regras gerais da CLT):**

| Item, sobre o salário | Lucro Real/Presumido | Simples Nacional, ou entidade filantrópica com CEBAS (sem INSS patronal) |
|---|---|---|
| 13º salário | 8,33% | 8,33% |
| Férias + 1/3 | 11,11% | 11,11% |
| FGTS de 8% sobre salário, 13º e férias | ≈ 9,56% | ≈ 9,56% |
| INSS patronal 20% + RAT ≈2% + terceiros 5,8% (≈ 27,8%) sobre salário, 13º e férias | ≈ 33,2% | 0% |
| **Multiplicador** | **≈ 1,62** | **≈ 1,29** |
| Custo mensal com salário de R$ 2.050 | ≈ R$ 3.325 | ≈ R$ 2.650 |
| + vale-refeição/transporte (hipótese: R$ 600/mês líquidos) | ≈ R$ 3.925 | ≈ R$ 3.250 |
| **2 recepcionistas × 12 meses** | **≈ R$ 80 mil a R$ 94 mil** | **≈ R$ 64 mil a R$ 78 mil** |

**Leitura:** R$ 91 mil/ano equivale a R$ 3.790/mês por recepcionista. Isso **cabe na faixa** da empresa no regime geral com benefícios, mas fica **acima** do que pagaria uma faculdade filantrópica (muitas privadas são). Nível: **Estimativa**.
**No pitch:** manter "estimativa do time" e, se a banca perguntar, dizer "de R$ 64 mil a R$ 94 mil/ano, conforme o regime; cada clínica põe o próprio número na calculadora".
O cálculo não inclui rescisão, provisão de multa do FGTS, uniforme, treinamento nem horas extras.

---

## 5. Tempo de espera para tratamento odontológico no SUS

**O "117,5 dias" não serve.** Ver §1.1 (a). É uma mediana de atraso na **procura** de tratamento, contada pelos pais, em crianças com cárie **na China**. Não é fila do SUS nem de adultos. Também há uma incoerência no próprio artigo: o resumo fala em "average delay", e os resultados dizem "median".

**O que existe para o Brasil:**

| Número | O que mede | Fonte | Nível |
|---|---|---|---|
| **Mediana de 5 dias (estomatologia) a 30 dias (endodontia)** | Tempo de espera para atendimento nos CEOs, por especialidade. Avaliação in loco dos 1.097 CEOs em 2018 (PMAQ-CEO, 2º ciclo). | Cavalcanti RP et al. *Factors associated with the waiting time for access to specialized oral healthcare services in Brazil.* **Community Dent Oral Epidemiol** 2022. doi:[10.1111/cdoe.12720](https://doi.org/10.1111/cdoe.12720) | Primária (resumo) |
| **P50 = 30 dias; P75 ≥ 90 dias** em endodontia, ortodontia e implante; P50 = 60 dias em implante | Espera para a atenção secundária informada pelos dentistas de 12.403 equipes de saúde bucal da atenção básica (PMAQ-AB, 2012). | Martins RC et al. *Relationship between Primary and Secondary Dental Care in Public Health Services in Brazil.* **PLOS ONE** 2016;11(10):e0164986. doi:[10.1371/journal.pone.0164986](https://doi.org/10.1371/journal.pone.0164986) · [PMC5068770](https://pmc.ncbi.nlm.nih.gov/articles/PMC5068770/) | Primária (resumo + trecho) |
| 30,8% esperavam 1 semana, 35,7% 1 mês e 33,5% mais de 1 mês | **Expectativa** do usuário de CEO para começar o tratamento. É autorrelato, não tempo medido. | da Cunha et al. 2022 (§1.2) | Primária |

**Sugestão para o slide 1:** os números brasileiros são **menores e menos dramáticos** que 117,5. Opções honestas:
(a) "**1 em cada 3** usuários de CEO esperava **mais de um mês** para começar o tratamento" (33,5%, da Cunha et al. 2022);
(b) "nos CEOs, a espera chega a **30 dias** na endodontia (mediana) e, para 1 em cada 4 equipes, passa de **90 dias**" (Cavalcanti 2022; Martins 2016);
(c) tirar o número e manter a mensagem qualitativa.

---

## 6. Programa Nacional de Redução das Filas (Portaria GM/MS nº 90/2023) cobre odontologia?

> Portaria GM/MS nº 90, de 3 de fevereiro de 2023. Institui o *Programa Nacional de Redução das Filas de Cirurgias Eletivas, Exames Complementares e Consultas Especializadas*, no âmbito do SUS. [gov.br/saude (SAES)](https://www.gov.br/saude/pt-br/composicao/saes/legislacao/portaria-gm-ms-no-90-de-3-de-fevereiro-de-2023/view) · [PDF (SES-SP)](https://portal.saude.sp.gov.br/resources/ses/perfil/gestor/documentos-de-planejamento-em-saude/programa-nacional-de-reducao-de-filas-plano-estadual-de-reducao-de-filas-2024-pt-gmms-n-902022-e-pt-gmms-n-2.3362023/u_pt-ms-gm-90_030223.pdf)

- O texto dos artigos **não menciona** odontologia, saúde bucal nem CEO. O foco é "Cirurgias Eletivas, Exames Complementares e Consultas Especializadas" (art. 1º e 3º, II). Nível: **Primária** (texto dos artigos). O anexo, com a base de cálculo, não foi lido.
- Foi alterada pela Portaria GM/MS nº 1.370/2023 (art. 9º) e prorrogada por mais um ano pela Portaria GM/MS nº 2.336, de 12/12/2023 ([BVS](https://bvsms.saude.gov.br/bvs/saudelegis/gm/2023/prt2336_13_12_2023.html)).
- **Não verificado:** se os planos estaduais incluíram procedimentos odontológicos (por exemplo, cirurgia bucomaxilofacial) nas filas financiadas. Isso dependeria de ler planos estaduais um por um.
- Política federal própria da odontologia especializada: os CEOs e o PMAQ-CEO (Portaria GM/MS nº 1.599/2015), hoje dentro do Brasil Sorridente.

**Frase segura:** "Na escala pública, o Sorriu+ se alinha à agenda federal de redução de filas (Portaria GM/MS 90/2023) e à rede de CEOs do Brasil Sorridente." **Não dizer** que o programa financia odontologia.

---

## 7. Números que NÃO devem ser usados

| Número | Por quê |
|---|---|
| **117,5 dias** como espera no SUS | É atraso na procura de tratamento por crianças em idade pré-escolar na China (Huang et al. 2025). Ver §1.1 e §5. |
| **20–35%** atribuído a BMC Public Health 2025 / Holtzman 2013 | O intervalo não aparece em nenhuma das duas fontes. Ver §1.1. |
| **18,65%** | Vem de consultas **médicas**, não odontológicas (já registrado em `motion/SPEC.md` §10). Não achamos a origem exata; nas buscas, os números parecidos são todos de consulta médica, como 19,2% numa UBS do Sul e 13,45% em especialidades no ES. |
| **23% (mundo) / 27,8% (América do Sul)** | Média de absenteísmo em **saúde em geral**, citada de segunda mão em artigos brasileiros. Não é odontologia, e a origem primária não foi conferida. |
| **R$ 117,03 por consulta** | Custo unitário de consulta em UBS (todas as áreas), não de odontologia. Ver §2. |
| **"62% dos brasileiros não procuram atendimento"** (Vital Strategies, 2025) | É atenção primária **médica**, não odontologia. |
| **"Afastamentos por dor de dente = até 35% da folha"** | Notícia sem estudo identificado. |
| **"Piracicaba reduziu faltas em 66,6%"** | O 66,6% é a **proporção de unidades** (8 de 12) onde as faltas caíram, não uma queda de 66,6%. No total das 12 USFs, a taxa **subiu** de ≈19,5% para ≈23,0% (Gonçalves et al. 2015). |
| Efeito de lembrete por SMS como **promessa** do Sorriu+ | A revisão Cochrane (Gurol-Urganci et al. 2013, CD007458) achou RR 1,14 (IC95% 1,03–1,26) de comparecimento com SMS contra nenhum lembrete, em 7 estudos com 5.841 participantes, em saúde **em geral**. Ela serve só como referência da hipótese; não é resultado do Sorriu+, e o Sorriu+ hoje **não envia push nem SMS** (protótipo). [Cochrane](https://www.cochrane.org/CD007458) |

---

## 8. Fora do escopo, mas visto de passagem

- **66% "dos estudantes que pensam em desistir de odontologia nunca tiveram prática clínica" (Revista da ABENO)**, usado no slide 13 e no trailer. **Não achamos** o artigo em buscas no site da revista e em bases abertas. Precisa do DOI antes da final; senão, sai do slide.

---

## 9. Valores iniciais da calculadora (`roi.html`) e de onde vêm

| Campo | Valor inicial | Origem |
|---|---|---|
| Pessoas na recepção | 2 | **Hipótese**: mesma base da estimativa de R$ 91 mil do time |
| Custo mensal por pessoa, com encargos | R$ 3.325 | **Estimativa**: R$ 2.050 (CAGED, §4) × 1,62 (encargos no regime geral, §4), sem benefícios |
| Consultas agendadas por mês | 600 | **Hipótese**: digite o número da sua clínica |
| Taxa de faltas | 27,7% | da Cunha et al. 2022 (§1.2): porcentagem de **pacientes** de CEO com ≥1 falta, usada como aproximação da porcentagem de consultas |
| Custo por consulta perdida | R$ 50 | **Hipótese**: não há fonte de odontologia (§2) |
| Parte do tempo da recepção gasta com agenda, confirmação e remarcação | 50% | **Hipótese** |
| Redução de faltas com o Sorriu+ | 10% (relativa) | **Hipótese conservadora**, menor que o efeito médio de lembretes por SMS em saúde geral (≈14% a mais de comparecimento, Cochrane 2013). **Não é resultado medido do Sorriu+.** |
| Parte do tempo de agenda que o Sorriu+ libera | 30% | **Hipótese** |
| Preço mensal do Sorriu+ | R$ 1.500 | **Hipótese**: não há preço definido |

---

*Protótipo de hackathon (HackaUSP 2026, Foolstack). Dados de pacientes são fictícios; este dossiê só trata de números públicos de contexto.*
