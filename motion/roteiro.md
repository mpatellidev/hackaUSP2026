# Roteiro do pitch — Sorriu+ (Foolstack · HackaUSP 2026)

Tempo total: **5 minutos no máximo**, em 12 slides: cerca de 540 palavras (ritmo de ~145 por minuto), 2 s de clique por slide e **20 s de demo animada** no slide 8 = **4:32 planejados**, com ~1 min de folga. Os slides estão em `slides.html`; cada clique avança uma animação ou o slide (▸ marca onde clicar). Tema do hackathon (**Saúde para todos: barreiras do acesso à saúde**): cada dor mostra um **selo de barreira** (financeira, organizacional, de informação, da continuidade, da recusa) e cada funcionalidade **derruba** o seu (risco + selo verde). Palavras-chave para repetir na fala: *acesso*, *barreira*, *saúde para todos*, *continuidade do cuidado*, *fila justa*.

A tecla **N** mostra estas falas na tela e a tecla **P** abre o modo apresentador com cronômetro; o botão **Ensaio** dele mede o tempo real de cada slide e diz onde cortar. A tecla **A** abre o apêndice com as respostas para as perguntas da banca. Se mudar uma fala aqui, mude também o array `NOTAS` em `slides.html` (ele alimenta as notas, o ensaio e a legenda do vídeo).

Números citados e fontes:
- **95 dias** de espera média pela primeira consulta especializada (até **170** na endodontia de molar): avaliação do CEO de Pelotas, *Epidemiologia e Serviços de Saúde*, 2015. Substitui os "117,5 dias", cuja fonte não foi localizada.
- **32,9%** de faltas nas primeiras consultas odontológicas especializadas (6.428 consultas, Belo Horizonte, 2011): *Ciência & Saúde Coletiva*, 2018. Substitui "20–35%" (a citação ao Holtzman estava errada: o artigo é da *Community Dent Oral Epidemiol* 2014, de uma clínica da UCLA, sem taxa geral). No slide 10, a conta usa **25%**, abaixo dos 32,9%, por ser conservadora.
- **66%** dos possíveis desistentes ainda não tinham vivido experiência prática: Carmo Filho et al., "Evasão acadêmica no curso de Odontologia de uma instituição pública…", *Revista da ABENO* 23(1), 2023 (UFC, 74 calouros). Cuidado: a amostra é pequena e o próprio estudo não mostra essa relação como estatisticamente significativa. Falar "ainda não tinham prática", nunca "a falta de prática causa desistência".
- R$ 91 mil por ano: **estimativa do time** (salário e encargos de 2 profissionais de recepção). Falar como estimativa.
- Modelo de negócio (opção D): **R$ 20 por cadeira/mês + R$ 20 por horário recuperado**. Premissas do time: 40 cadeiras (exemplos reais: UniCesumar 36, PUCRS 52, UPE 63), 4 atendimentos/dia (rodízio de 2 h em 8 h), 200 dias letivos (LDB, art. 47), 25% de faltas, 30% dos vazios recuperados (a medir no piloto). Conta: 40 × 4 × 200 = 32.000 horários; 8.000 vazios; 2.400 recuperados; receita = 9,6 mil + 48 mil = **R$ 57,6 mil por clínica/ano**.
- Ganho da clínica (base): 2.400 × R$ 15 de taxa social (exemplo Newton Paiva, BH) = R$ 36 mil; recepção até R$ 91 mil; 3 alunos retidos × R$ 36 mil de mensalidade (faixa de mercado R$ 2,5–3,3 mil/mês, Pravaler e Guia da Carreira) = R$ 108 mil; total ≈ **R$ 235 mil** → retorno ≈ 4× (conservador: R$ 72 mil → 1,25×).
- Base de pesquisa do slide 9 (faixa sob o título): **36–63 cadeiras por clínica-escola** (UniCesumar Londrina 36 e PUCRS 52, privadas; UPE Arcoverde 63, pública; média das privadas ≈ 44, então as 40 da conta são conservadoras); **~250 alunos por curso** (162,7 mil alunos ÷ 650 cursos, dado do MEC citado por blog, a confirmar no e-MEC); **1.200–1.500 pacientes/mês** (Uniban, privada de SP, capacidade declarada; FO-USP, pública); **1 professor para 5 alunos em clínica** (Parecer CNE/CES 230/2004); evasão de 19,9% (UFRGS) a 45,7% (UFPB). Uninove, Anhembi Morumbi e São Judas **não publicam** o número de cadeiras no site nem nos PPCs consultados; o PPC da Anhembi Morumbi foi lido e não traz a contagem.
- Escala: 5 clínicas = R$ 288 mil (ano 1); 20 = R$ 1,15 mi; 50 = R$ 2,9 mi. Para a banca (Capim): o aluno de hoje é o dentista-cliente de amanhã, e caso que não cabe em nenhuma clínica-escola pode ir a uma clínica privada parceira **se o paciente escolher** (apêndice, cartão 3).
- Programa Nacional de Redução das Filas: Portaria GM/MS nº 90, de 3/2/2023 (cirurgias eletivas, exames e consultas especializadas). Falar como alinhamento, não como cobertura garantida da odontologia.

Ficaram de fora (sem fonte odontológica verificada): 18,65% de faltas e "12 clínicas, 120 mil agendamentos" (o dado é de consultas médicas), "até 18% de custo por falta" e "quase 19% da capacidade". Base de cadastrados e redução de desperdício seguem sem número.

Taxa social: o app é gratuito para o paciente; a clínica-escola pode cobrar uma taxa social (exemplo real: R$ 15 na Newton Paiva, BH). O chip do slide 4 diz "Taxa social · R$ 15".

Regras de fala: o paciente **confirma** antes de ir para outra clínica (nada é agendado sozinho); o app não liga para ninguém; nunca dizer "vaga garantida".

Fio condutor: **Dona Cida** (54, diarista em Guaianases) e **Rafael** (3º ano de odontologia) são **personagens ilustrativos**. A Cida aparece no mapa, no selo do celular em todos os slides de produto (na ordem da jornada: acha a clínica → sobe na fila → é encaminhada → o histórico vai junto), na demo e no fechamento ("a Cida voltou a sorrir, e o Rafael ganhou prática").

---

**Slide 0 · Abertura: Sorriu+, Foolstack (0:00–0:10)**
Bom dia! Nós somos a Foolstack, e este é o Sorriu+: a porta que não se fecha no primeiro “não”.

**Slide 1 · A história: Dona Cida e Rafael, a mesma cidade (0:10–0:39)**
Esta é a Dona Cida, diarista em Guaianases. Está com dor de dente há quatro meses, não pode pagar um dentista e encara uma fila enorme. ▸ Este é o Rafael, terceiro ano de odontologia. Ele precisa de pacientes para se formar, e o paciente de hoje faltou. ▸ Os dois moram na mesma cidade e nunca se encontram. Não falta dentista. Não falta paciente. Falta a ponte.

**Slide 2 · Barreiras de acesso: paciente na fila, cadeira vazia (0:39–1:03)**
E a Cida não é exceção. No SUS, a espera média pela primeira consulta odontológica especializada é de noventa e cinco dias; para um canal, até cento e setenta. Enquanto isso, um terço das consultas termina em falta, como a do Rafael. ▸ Para quem tem baixa renda, saúde bucal ainda é privilégio.

**Slide 3 · Por que a barreira existe (1:03–1:22)**
Por quê? Cada clínica-escola trabalha isolada, com planilha, caderno e sistema próprio. ▸ Quem precisa nem sabe que ela existe. ▸ E se o paciente troca de clínica-escola, a ficha fica para trás: ele refaz o raio-X e começa tudo do zero.

**Slide 4 · Solução: o hub e o celular da Cida (1:22–1:44)**
O Sorriu+ derruba essas barreiras: um hub que conecta pacientes às clínicas-escola. ▸ No celular, a Cida acha uma clínica-escola a um vírgula sete quilômetros, com taxa social de quinze reais, ▸ vê horário e acessibilidade e faz o pedido em poucos toques. E nenhuma clínica precisa abandonar o próprio sistema.

**Slide 5 · Acesso justo: score com regras humanas (1:44–2:05)**
Na fila, o score soma comparecimento e situação socioeconômica, para não punir quem falta por falta de dinheiro. ▸ Quem comparece avança, e a Cida sobe. Mas com regras humanas: urgência avaliada por profissional vem antes, falta justificada é revista e ninguém perde o direito ao atendimento.

**Slide 6 · Acesso sem recusa: encaminhamento (2:05–2:24)**
Só que o tratamento da Cida não cabe na grade deste semestre. Em vez de recusa, encaminhamento: o sistema cruza especialidade, grade e distância. ▸ Ela confirma antes de ir, e o caminho é de mão dupla. Nenhuma recusa vira desistência.

**Slide 7 · Continuidade do cuidado: prontuário único (2:24–2:40)**
E o histórico vai junto. Com o prontuário único, triagem, exames e laudo seguem a Cida, e cada acesso fica registrado. ▸ Outra clínica só vê com a confirmação dela. Ninguém recomeça do zero.

**Slide 8 · Painel da clínica-escola + demo animada de 20 s (2:40–3:20)**
Do lado da clínica-escola, tudo num painel: os pedidos chegam organizados, ▸ a fila aparece por prioridade, com a urgência primeiro, ▸ e o prontuário é validado pelo professor. **[D: demo animada, 20 s]** Em vinte segundos, a jornada da Cida, do pedido à confirmação.

**Slide 9 · Ganha-ganha: a clínica-escola economiza e fatura (3:20–3:47)**
A clínica-escola ganha dos dois lados. Economiza até noventa e um mil reais de recepção e deixa de jogar material fora. E fatura: horário recuperado vira atendimento, e cada aluno que não desiste vale trinta e seis mil reais de mensalidade por ano. ▸ Numa clínica de quarenta cadeiras, são cerca de duzentos e trinta e cinco mil reais por ano.

**Slide 10 · Modelo de negócio: como a gente ganha e escala (3:47–4:21)**
E a gente? Cada cadeira gira a cada duas horas: oitocentos atendimentos por ano. Em quarenta cadeiras, um quarto falta: oito mil horários vazios, e recuperamos trinta por cento. ▸ Cobramos vinte reais por cadeira por mês e vinte por horário recuperado: cinquenta e sete mil e seiscentos por clínica. Para cada real, a clínica ganha quatro. ▸ Com cinquenta clínicas, quase três milhões por ano, e depois a rede pública, com o Programa Nacional de Redução das Filas.

**Slide 11 · Encerramento: Cida sorri, placar das barreiras, o time (4:21–4:32)**
A Cida voltou a sorrir, e o Rafael ganhou prática. Saúde para todos começa pelo acesso. Nós somos a Foolstack. Obrigado!
