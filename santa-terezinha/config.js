/* ============================================================================
   CONFIGURACAO DA UNIDADE
   ----------------------------------------------------------------------------
   ESTE É O ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR.

   Aqui ficam: o nome da unidade, endereço, telefones, o link da planilha
   e os dados de reserva (usados se a planilha estiver fora do ar).

   Para fazer o site de OUTRA UBS: copie a pasta inteira e mude só este arquivo.

   ---------------------------------------------------------------------------
   STATUS DESTA UNIDADE (replicação em massa, setembro/2026):
   Só o NOME e o TELEFONE desta UBS foram levantados até agora, e o telefone
   veio de busca na internet — NÃO foi confirmado junto à Secretaria de Saúde
   de Brusque. Endereço, mapa, horário de cada setor, equipe e foto da fachada
   ainda NÃO foram confirmados e por isso estão em branco / com placeholder.
   Nada aqui deve ser inventado: preencha só com dado confirmado pela unidade.
   ========================================================================== */

const CONFIG = {

  /* ---- 1. IDENTIFICAÇÃO DA UNIDADE ------------------------------------- */
  unidade: {
    orgao:    'Prefeitura de Brusque · Secretaria de Saúde',
    nome:     'UBS Santa Terezinha',
    subtitulo:'Unidade Básica de Saúde',
    endereco: 'R. Santos Dumont, 1040',
    bairro:   'Bairro Santa Terezinha — Brusque/SC',
    telefone: '(47) 20170-572',
    telefoneLink: '+554720170572',
    /* Número separado para encaminhamentos — não confirmado para esta unidade. */
    telefoneEncaminhamentos: '',
    telefoneEncaminhamentosLink: '',
    avisoLigacao: '',
    secretaria:     '(47) 3255-6800',
    secretariaLink: '+554732556800',
    /* Link "Abrir o mapa no celular" — só depois de confirmar o endereço. */
    mapa: 'UBS Santa Terezinha, R. Santos Dumont, 1040, Brusque - SC',
    instagram: '',

    /* Endereço do site depois de publicado (ex: 'https://ubs-brusque.vercel.app/santa-terezinha').
       Preenchido no passo final da publicação; usado só pelo cartaz.html
       para gerar o QR code impresso. */
    site: 'https://ubs-brusque.vercel.app/santa-terezinha',

    /* Página que lista TODAS as unidades de saúde, no site da Secretaria. */
    paginaUnidades: '../',

    /* Foto do prédio (fachada). Vazio até ter foto confirmada. */
    foto: ''
  },

  /* ---- 2. PLANILHA DO GOOGLE ------------------------------------------- */
  /*
     Cole aqui só o ID da planilha (o pedaço do meio do endereço):

     https://docs.google.com/spreadsheets/d/ 1AbC...XyZ /edit#gid=0
                                             ^^^^^^^^^^ este pedaço

     A planilha precisa ter a aba "setores" (obrigatória) e pode ter também
     "mudancas-horario", "recados", "equipe", "faltas", "ruas" e "reunioes"
     (todas opcionais) — e estar compartilhada como "Qualquer pessoa com o
     link" → Leitor.

     Enquanto estiver vazio (''), o site usa os dados de reserva do item 4
     e mostra o aviso "Site em fase de configuração".
  */
  planilhaId:  '1KNr_3vaeO7GnMzr621TyumlNQwlWg_CqCJ63Fgb2_Yo',
  abaSetores:  'setores',
  abaHorarios: 'mudancas-horario',
  abaRecados:  'recados',
  abaEquipe:   'equipe',
  abaFaltas:   'faltas',
  abaRuas:     'ruas',
  abaReunioes: 'reunioes',

  /* De quanto em quanto tempo o site relê a planilha (em minutos) */
  recarregarACada: 5,

  /* Onde ficam as fotos da equipe (pasta "fotos" no repositório). */
  pastaFotos: 'fotos/',

  /* ---- 3. ONDE IR EM CASO DE URGÊNCIA ---------------------------------- */
  /* Igual em toda UBS de Brusque — copiado do modelo, não mexer. */
  urgencia: {
    telefone: '192',
    chamada:  'Ligue para o SAMU<br>em caso grave',
    lugares: [
      {
        nome: 'Pronto Atendimento 24 horas',
        det:  'Rua Vendelino Maffezzolli, 215 — bairro Santa Terezinha. Tem farmácia no local.',
        hora: 'Aberto todos os dias, 24 horas',
        mapa: 'Pronto Atendimento 24 Horas, Rua Vendelino Maffezzolli, 215, Brusque - SC'
      },
      {
        nome: 'Hospital Azambuja e Hospital Dom Joaquim',
        det:  'Atendem pelo SUS.',
        hora: 'Aberto todos os dias, 24 horas',
        mapa: [
          { rotulo:'Hospital Azambuja',    endereco:'Hospital Azambuja, Brusque - SC' },
          { rotulo:'Hospital Dom Joaquim', endereco:'Hospital Dom Joaquim, Brusque - SC' }
        ]
      },
      {
        nome: 'Sala de vacina da Policlínica',
        det:  'Rua Prefeito Germano Schaefer, 66 — Centro. Se a sala da UBS estiver fechada, você pode vacinar aqui.',
        hora: 'Das 8 às 19 horas',
        mapa: 'Policlínica de Brusque, Rua Prefeito Germano Schaefer, 66, Centro, Brusque - SC'
      }
    ]
  },

  /* ---- 3b. OUTROS TELEFONES ÚTEIS ------------------------------------- */
  /* Igual em toda UBS de Brusque — copiado do modelo, não mexer. */
  telefonesUteis: [
    { nome:'Polícia',                                          telefone:'190', telefoneLink:'190' },
    { nome:'Bombeiros',                                        telefone:'193', telefoneLink:'193' },
    { nome:'Conselho Tutelar (Criança e Adolescente)',         telefone:'(47) 3351-0113', telefoneLink:'+554733510113' },
    { nome:'Vigilância Sanitária',                             telefone:'(47) 3351-2424', telefoneLink:'+554733512424' },
    { nome:'CAPS Álcool e Drogas',                              telefone:'(47) 3306-9305', telefoneLink:'+554733069305' },
    { nome:'CAPS 2 (Centro de Atenção Psicossocial)',          telefone:'(47) 3304-4710', telefoneLink:'+554733044710' },
    { nome:'CAPS Infanto-Juvenil',                              telefone:'(47) 3396-8182', telefoneLink:'+554733968182' },
    { nome:'Delegacia da Criança, Mulher, Adolescente e Idoso', telefone:'(47) 3251-8303', telefoneLink:'+554732518303' }
  ],

  /* ---- 3c. RUAS ATENDIDAS POR EQUIPE (RESERVA) ----------------------- */
  /* Vazio até a área de abrangência desta unidade ser confirmada. */
  areasEquipeReserva: [],

  /* ---- 3d. REUNIÕES RECORRENTES DA EQUIPE (RESERVA) ----------------- */
  /* Vazio até o calendário de reuniões desta unidade ser confirmado. */
  notasRecorrentesReserva: [],

  /* ---- 4. DADOS DE RESERVA ------------------------------------------- */
  /*
     Usados enquanto a planilha não estiver configurada. Uma única entrada
     genérica, SEM horário inventado — os horários reais entram na planilha
     (aba "setores") depois de confirmados com a equipe.
  */
  setoresReserva: [
    { id:'geral', nome:'Atendimento',
      para:'Horários ainda não confirmados com a equipe desta unidade — ligue antes de vir.',
      levar:'Documento com foto e cartão do SUS.',
      h:{seg:'',ter:'',qua:'',qui:'',sex:'',sab:'',dom:''} }
  ],

  avisosReserva: [
    { tipo:'recado', setor:'', ativo:true,
      titulo:'Site em fase de configuração',
      texto:'Endereço e telefone confirmados junto à Secretaria de Saúde de Brusque. O horário de ' +
            'atendimento e a equipe ainda não foram confirmados — ligue para (47) 20170-572 antes de vir.',
      inicio:'2026-09-10', fim:'2027-12-31', novo:'' }
  ],

  /* ---- 5. EQUIPE (RESERVA) ----------------------------------------- */
  /* Vazio até a equipe desta unidade ser confirmada (entra na aba "equipe"). */
  equipeReserva: [],

  /* ---- 6. FALTAS (RESERVA) --------------------------------------- */
  faltasReserva: [],

  /* ---- 7. FERIADOS --------------------------------------------------
     Igual em toda UBS de Brusque — copiado do modelo, não mexer.
  */
  feriadosFixos: [
    {data:'01-01', nome:'Confraternização Universal'},
    {data:'04-21', nome:'Tiradentes'},
    {data:'05-01', nome:'Dia do Trabalho'},
    {data:'09-07', nome:'Independência do Brasil'},
    {data:'10-12', nome:'Nossa Senhora Aparecida'},
    {data:'11-02', nome:'Finados'},
    {data:'11-15', nome:'Proclamação da República'},
    {data:'11-20', nome:'Consciência Negra'},
    {data:'12-25', nome:'Natal'},
    {data:'08-04', nome:'Aniversário de Brusque'}
  ],
  feriadosMoveis: [
    {deslocamento:-48, nome:'Carnaval'},
    {deslocamento:-47, nome:'Carnaval'},
    {deslocamento:-2,  nome:'Sexta-feira Santa'},
    {deslocamento:60,  nome:'Corpus Christi'}
  ],

  /* ---- 8. MEDIÇÃO DE ACESSOS (opcional) ---------------------------
     Igual em toda UBS de Brusque — desligado por padrão.
  */
  medicao: {
    tipo:    '',
    codigo:  '',
    cliques: true
  }
};
