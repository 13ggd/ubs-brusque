(function(){
'use strict';
var K     = ['dom','seg','ter','qua','qui','sex','sab'];
var NOME  = {seg:'Segunda-feira',ter:'Terça-feira',qua:'Quarta-feira',
             qui:'Quinta-feira',sex:'Sexta-feira',sab:'Sábado',dom:'Domingo'};
var CURTO = {seg:'segunda',ter:'terça',qua:'quarta',qui:'quinta',
             sex:'sexta',sab:'sábado',dom:'domingo'};
var ORD   = ['seg','ter','qua','qui','sex','sab','dom'];
var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho',
             'agosto','setembro','outubro','novembro','dezembro'];

var SETORES  = CONFIG.setoresReserva;
var AVISOS   = CONFIG.avisosReserva;
var EQUIPE   = CONFIG.equipeReserva;
var FALTAS   = CONFIG.faltasReserva;
var RUAS     = CONFIG.areasEquipeReserva;   /* ruas atendidas por equipe — [{equipe, ruas:[...]}] */
var REUNIOES = CONFIG.notasRecorrentesReserva;   /* regras "toda 2ª/4ª quarta..." — [{setores, dia, ocorrencias, texto}] */
/* Rua que a pessoa escolheu no card "Minha rua". Lida do localStorage em
   montarBuscaDeRua() e guardada só no aparelho dela — nunca sai daí. */
var RUA_ESCOLHIDA = null;
var ORIGEM   = 'reserva';   /* 'planilha' | 'reserva' | 'erro' */
var AVISOS_DA_PLANILHA = false;   /* true só quando horarios ou recados vieram da planilha de verdade */
/* Quando os dados na tela não vieram da rede agora, e sim do que o service
   worker tinha guardado, o sw.js carimba a resposta com a hora em que ela foi
   guardada. É isso que deixa a linha do rodapé dizer "guardado ontem às 16h"
   em vez de "carregado agora" — a diferença entre avisar que o horário pode
   estar velho e afirmar que ele é o de hoje. Fica null quando veio da rede. */
var GUARDADO_EM = null;
/* Vira true assim que a planilha é lida com sucesso uma vez nesta sessão.
   Serve pro rodapé não prometer "os últimos horários conhecidos" quando o
   que está na tela são, na verdade, os dados fixos do config.js — que podem
   nunca ter batido com a realidade da unidade. */
var JA_LEU_A_PLANILHA = false;
function mm(t){ var p = t.split(':'); return Number(p[0])*60 + Number(p[1]); }
function hh(v){
  return String(Math.floor(v/60)).padStart(2,'0') + ':' + String(v%60).padStart(2,'0');
}
/* "07:00" vira "7h"; "08:30" vira "8h30" — jeito que as pessoas falam */
function hf(t){
  var p = t.split(':');
  return p[1] === '00' ? Number(p[0]) + 'h' : Number(p[0]) + 'h' + p[1];
}
function fala(f){
  if(!f) return 'Fechado';
  /* Um setor pode ter mais de um bloco no dia (ex: fecha pro almoço).
     Cada bloco vem separado por vírgula: "07:00-12:00,13:00-19:00". */
  return f.split(',').map(function(bloco){
    var p = bloco.split('-');
    return 'das ' + hf(p[0]) + ' às ' + hf(p[1]);
  }).join(' e ');
}
function iso(d){
  return d.getFullYear() + '-' +
         String(d.getMonth()+1).padStart(2,'0') + '-' +
         String(d.getDate()).padStart(2,'0');
}
function brData(s){ return s.split('-').reverse().join('/'); }

/* Lista os dias do mês (ano/mes) em que um dia da semana (chave de K, ex:
   'qua') cai na 1ª, 2ª, 3ª... ocorrência daquele mês — a base pra
   transformar "2ª e 4ª quarta-feira" numa data de verdade, sem ninguém
   ter que contar no calendário. */
function diasDoMesPorOcorrencia(ano, mes, diaSemana, ocorrencias){
  var alvo = K.indexOf(diaSemana);
  var dias = [], ocorrencia = 0;
  var d = new Date(ano, mes, 1);
  while(d.getMonth() === mes){
    if(d.getDay() === alvo){
      ocorrencia++;
      if(ocorrencias.indexOf(ocorrencia) !== -1) dias.push(d.getDate());
    }
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

/* Mesma coisa, mas pulando pro mês seguinte se todas as datas deste mês
   já passaram — assim o aviso nunca mostra uma data que já ficou pra
   trás, sempre aponta pra próxima ocorrência de verdade. */
function proximasDatas(data, diaSemana, ocorrencias){
  var dias = diasDoMesPorOcorrencia(data.getFullYear(), data.getMonth(), diaSemana, ocorrencias)
    .filter(function(dia){ return dia >= data.getDate(); });
  var mes = data.getMonth();
  if(!dias.length){
    var prox = new Date(data.getFullYear(), data.getMonth() + 1, 1);
    dias = diasDoMesPorOcorrencia(prox.getFullYear(), prox.getMonth(), diaSemana, ocorrencias);
    mes = prox.getMonth();
  }
  return {dias: dias, mes: mes};
}

function formatarDatas(dias, mes){
  if(!dias.length) return '';
  var nomeMes = MESES[mes];
  var rotulo = dias.length === 1
    ? 'No dia ' + dias[0]
    : 'Nos dias ' + dias.slice(0, -1).join(', ') + ' e ' + dias[dias.length - 1];
  return rotulo + ' de ' + nomeMes;
}

/* Junta as regras de REUNIOES que valem pra esse setor, já com a data de
   verdade calculada em cima da data mostrada na tela (respeita a barra
   de teste "?teste", não usa o relógio real direto). */
function notasRecorrentesDoSetor(setorId, data){
  return (REUNIOES || [])
    .filter(function(r){ return r.setores.indexOf(setorId) !== -1; })
    .map(function(r){
      var p = proximasDatas(data, r.dia, r.ocorrencias);
      var datas = formatarDatas(p.dias, p.mes);
      return datas ? datas + ', ' + r.texto : '';
    })
    .filter(Boolean);
}

/* Evita que texto vindo da planilha quebre a página */
function limpo(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

/* ------------------------------------------------------- leitor de CSV -- */
/* Respeita vírgulas dentro de aspas, para os textos longos dos avisos. */
function lerCSV(txt){
  var linhas = [], campo = '', linha = [], aspas = false, i, c;
  for(i = 0; i < txt.length; i++){
    c = txt[i];
    if(aspas){
      if(c === '"'){
        if(txt[i+1] === '"'){ campo += '"'; i++; } else { aspas = false; }
      } else { campo += c; }
    } else {
      if(c === '"'){ aspas = true; }
      else if(c === ','){ linha.push(campo); campo = ''; }
      else if(c === '\n'){ linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else if(c !== '\r'){ campo += c; }
    }
  }
  if(campo !== '' || linha.length){ linha.push(campo); linhas.push(linha); }
  return linhas;
}

/* Primeira linha do CSV vira o nome das colunas */
function paraObjetos(txt){
  var l = lerCSV(txt).filter(function(x){
    return x.some(function(c){ return c.trim() !== ''; });
  });
  if(l.length < 2) return [];
  var cab = l[0].map(function(c){ return c.trim().toLowerCase(); });
  return l.slice(1).map(function(linha){
    var o = {};
    cab.forEach(function(nome, i){ o[nome] = (linha[i] || '').trim(); });
    return o;
  });
}

/* Aceita 19/08/2026, 19-08-2026, 19/08/26 ou 2026-08-19 e devolve sempre 2026-08-19.
   Ano com 2 dígitos vira 20XX — quem digita na planilha escreve "26" por hábito
   de calendário/agenda de papel, e antes disso caía no fallback genérico
   `new Date(s)`, que para "23/09/26" dá Invalid Date: a falta/aviso sumia sem
   nenhum aviso no console, porque `dataIlegivel()` só dispara quando o campo
   não estava em branco — que era exatamente o caso. */
/* Confere se a data existe mesmo no calendário. Sem isso, um dedo trocado na
   planilha ("32/13/2026", ou o mês e o dia invertidos) virava uma data que
   nunca chega: o aviso ou ficava preso para sempre em "Avisos futuros", ou
   sumia sem deixar rastro. Nos dois casos, calado — que é o pior jeito de
   falhar num aviso de fechamento. Devolver null faz a linha ser tratada como
   "sem data", igual a qualquer outro campo que não deu pra entender. */
function dataExiste(ano, mes, dia){
  if(mes < 1 || mes > 12 || dia < 1) return false;
  var d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia;
}

function normalizaData(s){
  s = (s || '').trim();
  var m = null;
  if(!s) return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)){
    m = s.split('-').map(Number);
    return dataExiste(m[0], m[1], m[2]) ? s : null;
  }
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if(m){
    var ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if(!dataExiste(ano, Number(m[2]), Number(m[1]))) return null;
    return ano + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : iso(d);
}

/* Campo de data em branco e campo de data com erro de digitação são coisas
   diferentes, e normalizaData() devolve null para os dois. Em branco é
   proposital — o aviso vale enquanto a caixinha estiver marcada. Com erro
   ("32/13/2026") não dá pra saber o dia que a pessoa quis, e as duas saídas
   possíveis são ruins: tratar como "sem data" fecharia o setor todo santo
   dia, e adivinhar seria pior ainda. Então a linha é descartada — o mesmo
   efeito de nunca ter sido escrita, errado num dia só em vez de todos — e o
   motivo vai pro console, que é onde quem cuida do site vai procurar. */
function dataIlegivel(bruto, normalizada){
  var tem = String(bruto === undefined || bruto === null ? '' : bruto).trim() !== '';
  return tem && !normalizada;
}

/* Aceita "7h às 19h", "07:00-19:00", "7-19", "Fechado" — devolve "07:00-19:00".
   Também aceita mais de um bloco no mesmo dia — útil pra representar horário
   de almoço. Vírgula OU espaço separam os blocos, então "7h às 12h, 13h às 19h"
   e "7-12 13-19" viram os dois "07:00-12:00,13:00-19:00" — isso evita que
   esquecer a vírgula faça o dia inteiro sumir como "não atende".
   Minuto com só 1 dígito (ex: "18:3") é rejeitado em vez de virar "18:03"
   por engano — mais seguro mostrar "não atende" do que um horário errado. */
function normalizaHorario(s){
  s = (s || '').trim();
  if(!s) return '';
  if(/^fechado|^n[aã]o|^-$/i.test(s)) return '';

  function arruma(t){
    var q = t.split(':');
    var h = Number(q[0]);
    var mTexto = q[1];
    if(mTexto !== undefined && mTexto.length !== 2) return null;
    var m = Number(mTexto || 0);
    if(isNaN(h) || h > 23 || isNaN(m) || m > 59) return null;
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  }

  var limpo = s
    .replace(/h(?!\s*\d)/gi, ':00')
    .replace(/h/gi, ':')
    .replace(/\s*(às|as|até|ate|–|—|a)\s*/gi, '-')
    .replace(/,/g, ' ')
    .replace(/[^\d: \-]/g, '');

  var blocos = limpo.match(/\d{1,2}(?::\d{1,2})?-\d{1,2}(?::\d{1,2})?/g) || [];
  return blocos.map(function(bloco){
    var p = bloco.split('-');
    var a = arruma(p[0]), b = arruma(p[1]);
    return (a && b) ? a + '-' + b : '';
  }).filter(Boolean).join(',');
}

/* -------------------------------------------------- buscar a planilha -- */
function urlCSV(aba){
  return 'https://docs.google.com/spreadsheets/d/' + CONFIG.planilhaId +
         '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(aba) +
         '&t=' + Date.now();
}

/* Busca com um limite de tempo. Sem isso, numa rede lenta ou instável,
   a página podia ficar presa em "Carregando horários" para sempre —
   depois de 8 segundos, desiste e segue com os dados que já tem. */
function buscarComLimite(url, segundos){
  var controle = ('AbortController' in window) ? new AbortController() : null;
  var timer = controle ? setTimeout(function(){ controle.abort(); }, (segundos || 8) * 1000) : null;
  return fetch(url, controle ? {signal: controle.signal} : undefined)
    .finally(function(){ if(timer) clearTimeout(timer); });
}

function planilhaConfigurada(){
  return CONFIG.planilhaId &&
         CONFIG.planilhaId.indexOf('COLE_O_ID') !== 0 &&
         CONFIG.planilhaId.length > 20;
}

/* Lê a caixinha de marcar (checkbox) da planilha. O Google Sheets exporta
   como TRUE/FALSE ou, em planilhas em português, VERDADEIRO/FALSO —
   aceitamos os dois. Se a coluna estiver vazia ou não existir, considera
   ativo (assim planilhas antigas, sem essa coluna, continuam funcionando). */
function paraBooleano(v){
  if(v === undefined || v === null) return true;
  var s = String(v).trim().toLowerCase();
  if(s === '') return true;
  return !(s === 'false' || s === 'falso' || s === '0' || s === 'nao' || s === 'não');
}

function buscarPlanilha(){
  GUARDADO_EM = null;
  if(!planilhaConfigurada()){
    ORIGEM = 'reserva';
    return Promise.resolve();
  }

  /* setores é a única aba obrigatória — sem ela o site não sabe nada
     sobre horários, então um erro aqui marca ORIGEM como 'erro'. */
  var principal = buscarComLimite(urlCSV(CONFIG.abaSetores)).then(function(r){
    if(!r.ok) throw new Error('planilha não respondeu');
    /* Só vem preenchido quando quem respondeu foi o cache do service worker. */
    GUARDADO_EM = (r.headers && r.headers.get('X-UBS-Guardado')) || null;
    return r.text();
  }).then(function(txt){
    var listaS = paraObjetos(txt).map(function(r){
      return {
        id:   r.setor || r.id || r.nome,
        nome: r.nome,
        para: r.para || r.descricao || '',
        levar: r.levar || r.trazer || '',
        h: {
          seg:normalizaHorario(r.seg), ter:normalizaHorario(r.ter),
          qua:normalizaHorario(r.qua), qui:normalizaHorario(r.qui),
          sex:normalizaHorario(r.sex), sab:normalizaHorario(r.sab),
          dom:normalizaHorario(r.dom)
        }
      };
    }).filter(function(s){ return s.nome; });

    /* Só troca se a planilha realmente trouxe setores.
       Assim uma planilha vazia por engano não apaga o site. */
    if(listaS.length){ SETORES = listaS; JA_LEU_A_PLANILHA = true; }
    ORIGEM = 'planilha';
  }).catch(function(e){
    console.error('Não consegui ler setores da planilha:', e);
    ORIGEM = 'erro';
  });

  /* Aba "mudancas-horario": cada linha é sobre UM setor específico. Se a coluna
     "novo" tiver um horário, é mudança de horário; se estiver vazia, é
     fechamento do dia todo. Não existe coluna "tipo" aqui de propósito —
     tira a chance de escolher a opção errada. */
  var horarios = buscarComLimite(urlCSV(CONFIG.abaHorarios)).then(function(r){
    if(!r.ok) throw new Error('sem aba horarios');
    return r.text();
  }).then(function(txt){
    return paraObjetos(txt).map(function(r){
      var bruta = r.inicio || r.data_inicio;
      var ini  = normalizaData(bruta);
      var novo = normalizaHorario(r.novo || r.novo_horario);
      return {
        tipo:       novo ? 'atencao' : 'fechado',
        setor:      (r.setor || r.setor_id || '').trim(),
        titulo:     r.titulo || '',
        texto:      r.texto || '',
        inicio:     ini,
        fim:        normalizaData(r.fim || r.data_fim) || ini,
        novo:       novo,
        ativo:      paraBooleano(r.ativo),
        dataRuim:   dataIlegivel(bruta, ini)
      };
    }).filter(function(a){
      if(a.dataRuim){
        console.error('Aviso ignorado: a data de início não existe no calendário.', a.setor, a.titulo);
        return false;
      }
      return a.setor;
    });
  }).catch(function(e){
    console.error('Não consegui ler horarios da planilha:', e);
    return null;   /* null = "não deu pra ler", diferente de [] = "leu e está vazia" */
  });

  /* Aba "recados": avisos gerais, sem ligação com nenhum setor. */
  var recados = buscarComLimite(urlCSV(CONFIG.abaRecados)).then(function(r){
    if(!r.ok) throw new Error('sem aba recados');
    return r.text();
  }).then(function(txt){
    return paraObjetos(txt).map(function(r){
      var bruta = r.inicio || r.data_inicio;
      var ini = normalizaData(bruta);
      return {
        tipo:       'recado',
        setor:      '',
        titulo:     r.titulo || '',
        texto:      r.texto || '',
        inicio:     ini,
        fim:        normalizaData(r.fim || r.data_fim) || ini,
        novo:       '',
        ativo:      paraBooleano(r.ativo),
        dataRuim:   dataIlegivel(bruta, ini)
      };
    }).filter(function(a){
      if(a.dataRuim){
        console.error('Recado ignorado: a data de início não existe no calendário.', a.titulo);
        return false;
      }
      return a.titulo;
    });
  }).catch(function(e){
    console.error('Não consegui ler recados da planilha:', e);
    return null;
  });

  /* A aba "equipe" é buscada à parte: se ela ainda não existir, isso não
     pode derrubar horários e avisos, que são mais importantes. */
  var equipe = buscarComLimite(urlCSV(CONFIG.abaEquipe)).then(function(r){
    if(!r.ok) throw new Error('sem aba equipe');
    return r.text();
  }).then(function(txt){
    var lista = paraObjetos(txt).map(function(r){
      return {
        nome:   r.nome || '',
        funcao: r.funcao || r['função'] || '',
        equipe: r.equipe || r.time || r.grupo || '',
        setor:  r.setor || '',
        foto:   r.foto || r.imagem || r.foto_url || '',
        obs:    r.obs || r.observacao || r['observação'] || '',
        /* Horário do TIME, não da pessoa — só precisa preencher numa linha
           por equipe (ex: só na médica) que o site acha sozinho, olhando
           quem tiver esse campo preenchido dentro do mesmo grupo "equipe". */
        horario: r.horario || r['horário'] || ''
      };
    }).filter(function(p){ return p.nome; });
    /* Diferente de setores: aqui uma planilha vazia É um resultado válido
       (equipe ainda não cadastrada). Por isso troca mesmo que venha vazia —
       só mantém os dados de exemplo se a aba "equipe" nem existir ainda. */
    EQUIPE = lista;
  }).catch(function(){
    /* Sem aba equipe ainda — mantém os dados de reserva, sem barulho. */
  });

  /* Aba "faltas": pessoa, motivo, inicio, fim, ativo. Serve pra
     duas coisas — mostrar "ausente hoje" no card da pessoa, e (só quando
     ela for a ÚNICA pessoa ligada àquele setor) fechar o setor sozinho. */
  var faltas = buscarComLimite(urlCSV(CONFIG.abaFaltas)).then(function(r){
    if(!r.ok) throw new Error('sem aba faltas');
    return r.text();
  }).then(function(txt){
    var lista = paraObjetos(txt).map(function(r){
      var bruta = r.inicio || r.data_inicio;
      var ini = normalizaData(bruta);
      if(dataIlegivel(bruta, ini)){
        console.error('Falta ignorada: a data de início não existe no calendário.', r.pessoa || r.nome);
      }
      return {
        pessoa:     (r.pessoa || r.nome || '').trim(),
        motivo:     r.motivo || '',
        inicio:     ini,
        fim:        normalizaData(r.fim || r.data_fim) || ini,
        ativo:      paraBooleano(r.ativo)
      };
    }).filter(function(f){ return f.pessoa && f.inicio; });
    FALTAS = lista;
  }).catch(function(){
    /* Sem aba faltas ainda — mantém os dados de reserva (vazio), sem barulho. */
  });

  /* Aba "ruas": equipe, rua — uma linha por rua atendida por cada equipe
     (área de abrangência). Igual a "equipe"/"faltas": opcional, e troca
     mesmo que venha vazia (só mantém a reserva se a aba nem existir). */
  var ruas = buscarComLimite(urlCSV(CONFIG.abaRuas)).then(function(r){
    if(!r.ok) throw new Error('sem aba ruas');
    return r.text();
  }).then(function(txt){
    var linhas = paraObjetos(txt).map(function(r){
      return {
        equipe: r.equipe || r.time || r.grupo || '',
        rua:    r.rua || r.endereco || r['endereço'] || ''
      };
    }).filter(function(x){ return x.equipe && x.rua; });
    var mapa = {}, ordem = [];
    linhas.forEach(function(x){
      if(!mapa[x.equipe]){ mapa[x.equipe] = []; ordem.push(x.equipe); }
      mapa[x.equipe].push(x.rua);
    });
    RUAS = ordem.map(function(equipe){ return { equipe: equipe, ruas: mapa[equipe] }; });
  }).catch(function(){
    /* Sem aba ruas ainda — mantém os dados de reserva, sem barulho. */
  });

  /* Aba "reunioes": setores, dia, ocorrencias, texto — regra tipo "toda
     2ª e 4ª quarta-feira do mês", em vez de uma linha nova a cada
     ocorrência: o site calcula as datas de verdade sozinho (mesma ideia
     de equipe/faltas/ruas — opcional, falha silenciosa). */
  var reunioes = buscarComLimite(urlCSV(CONFIG.abaReunioes)).then(function(r){
    if(!r.ok) throw new Error('sem aba reunioes');
    return r.text();
  }).then(function(txt){
    REUNIOES = paraObjetos(txt).map(function(r){
      return {
        setores: String(r.setores || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean),
        dia: (r.dia || '').trim().toLowerCase(),
        ocorrencias: String(r.ocorrencias || '').split(',')
          .map(function(n){ return parseInt(n.trim(), 10); }).filter(function(n){ return !isNaN(n); }),
        texto: r.texto || ''
      };
    }).filter(function(r){
      return r.setores.length && K.indexOf(r.dia) !== -1 && r.ocorrencias.length && r.texto;
    });
  }).catch(function(){
    /* Sem aba reunioes ainda — mantém os dados de reserva, sem barulho. */
  });

  return Promise.all([principal, horarios, recados, equipe, faltas, ruas, reunioes]).then(function(res){
    var h = res[1], r = res[2];
    /* Só substitui os avisos de reserva se pelo menos uma das duas abas
       (horarios ou recados) respondeu de verdade. Se as duas ainda não
       existirem, mantém os avisos de exemplo, sem apagar nada. */
    if(h !== null || r !== null){
      AVISOS = (h || []).concat(r || []);
      /* Setor/datas preenchidos, mas título esquecido: em vez de descartar
         o aviso inteiro (perdendo o fechamento que a pessoa quis registrar),
         gera um título a partir do nome do setor. Só se aplica a avisos
         ligados a um setor — "recados" sem título continuam sendo
         ignorados, porque aí não sobra nenhuma pista do que se trata. */
      AVISOS.forEach(function(a){
        if(a.titulo || a.tipo === 'recado') return;
        if(a.setor === 'todos'){
          /* Sem "hoje" de propósito: esse título é gerado uma vez e reaproveitado
             em qualquer dia que o aviso for exibido — inclusive antes de começar
             a valer, na seção "Avisos futuros". A data certa já aparece embaixo,
             na linha "Quando:". */
          a.titulo = a.tipo === 'atencao' ? 'A UBS muda de horário' : 'A UBS não vai abrir';
          return;
        }
        var setor = SETORES.filter(function(s){ return s.id === a.setor; })[0];
        var nome = setor ? setor.nome : a.setor;
        a.titulo = a.tipo === 'atencao' ? nome + ' com horário alterado' : nome + ' não vai atender';
      });
      AVISOS_DA_PLANILHA = true;
    } else {
      AVISOS_DA_PLANILHA = false;
    }
    /* Depois de já ter AVISOS, EQUIPE e FALTAS todos atualizados, gera os
       fechamentos automáticos de setor com uma só pessoa responsável. */
    AVISOS = AVISOS.concat(sintetizarFechamentosPorFalta());
  });
}

/* --------------------------------------------------- regras de horário -- */
/* --------------------------------------------------------- feriados -- */
/* Calcula a data da Páscoa de um ano (algoritmo de Gauss/Meeus) — a
   partir dela dá pra achar Carnaval, Sexta-feira Santa e Corpus Christi,
   que mudam de data todo ano. Funciona pra qualquer ano, sem precisar
   atualizar nada. */
function calcularPascoa(ano){
  var a = ano % 19, b = Math.floor(ano/100), c = ano % 100;
  var d = Math.floor(b/4), e = b % 4;
  var f = Math.floor((b+8)/25), g = Math.floor((b-f+1)/3);
  var h = (19*a + b - d - g + 15) % 30;
  var i = Math.floor(c/4), k = c % 4;
  var l = (32 + 2*e + 2*i - h - k) % 7;
  var m = Math.floor((a + 11*h + 22*l) / 451);
  var mes = Math.floor((h + l - 7*m + 114) / 31);
  var dia = ((h + l - 7*m + 114) % 31) + 1;
  return new Date(ano, mes-1, dia);
}
function somaDias(data, n){
  var r = new Date(data.getTime());
  r.setDate(r.getDate() + n);
  return r;
}
/* Lista dos feriados de um ano específico — junta os fixos (mesmo dia
   todo ano) com os móveis (calculados a partir da Páscoa daquele ano). */
function feriadosDoAno(ano){
  var lista = CONFIG.feriadosFixos.map(function(f){
    return {data: ano + '-' + f.data, nome: f.nome};
  });
  var pascoa = calcularPascoa(ano);
  CONFIG.feriadosMoveis.forEach(function(f){
    lista.push({data: iso(somaDias(pascoa, f.deslocamento)), nome: f.nome});
  });
  return lista;
}
/* Diz se uma data (formato AAAA-MM-DD) é feriado, e qual — ou null. */
function feriadoInfo(dataISO){
  var ano = Number(dataISO.slice(0,4));
  var achado = feriadosDoAno(ano).filter(function(f){ return f.data === dataISO; });
  return achado.length ? achado[0] : null;
}

function avisosDoDia(dataISO){
  var lista = AVISOS.filter(function(a){
    if(a.ativo === false) return false;      /* checkbox desmarcado = nunca aparece */
    if(!a.inicio) return true;                /* sem data = fica ativo enquanto marcado */
    return a.inicio <= dataISO && dataISO <= (a.fim || a.inicio);
  });
  var fer = feriadoInfo(dataISO);
  if(fer){
    lista = [{
      tipo:'recado', setor:'', titulo:'Hoje é feriado',
      texto: fer.nome + '. A unidade não abre hoje.',
      inicio: dataISO, fim: dataISO, novo:'', ativo:true
    }].concat(lista);
  }
  return lista;
}

/* Avisos que já foram cadastrados mas ainda não começaram a valer —
   pra alguém não ser pego de surpresa chegando na unidade, ou só saber
   ao abrir o site bem em cima da hora. Ordenados pelo mais próximo primeiro. */
function avisosFuturos(dataISO){
  return AVISOS.filter(function(a){
    if(a.ativo === false) return false;
    return a.inicio && a.inicio > dataISO;
  }).sort(function(a, b){ return a.inicio < b.inicio ? -1 : (a.inicio > b.inicio ? 1 : 0); });
}

/* "todos" na coluna "setor" de mudancas-horario fecha a UBS inteira com
   uma linha só, em vez de precisar repetir o fechamento pra cada setor —
   útil pra um imprevisto (falta de energia, problema estrutural) que
   afeta a unidade toda de uma vez. */
function avisoDe(id, dataISO){
  var fer = feriadoInfo(dataISO);
  if(fer) return {tipo:'fechado', setor:id, titulo:'Fechado — feriado',
                  texto: fer.nome + '. A unidade não abre em feriados.', ativo:true};
  var r = avisosDoDia(dataISO).filter(function(a){ return a.setor === id || a.setor === 'todos'; });
  return r.length ? r[0] : null;
}

/* Mesma ideia de avisosDoDia, mas para a aba "faltas". */
function faltasDoDia(dataISO){
  return FALTAS.filter(function(f){
    if(f.ativo === false) return false;
    return f.inicio <= dataISO && dataISO <= (f.fim || f.inicio);
  });
}
function faltaDe(nomePessoa, dataISO){
  var r = faltasDoDia(dataISO).filter(function(f){ return f.pessoa === nomePessoa; });
  return r.length ? r[0] : null;
}

/* Lista os ids de setor de uma pessoa (o campo aceita mais de um,
   separado por vírgula). */
function setoresDe(pessoa){
  return String(pessoa.setor || '').split(',')
    .map(function(s){ return s.trim(); }).filter(Boolean);
}

/* O coração do fechamento automático por falta.
   Regra: só fecha um setor sozinho quando ele tem EXATAMENTE uma pessoa
   da equipe ligada a ele. Com duas ou mais, o site não tem como saber se
   as outras estão cobrindo o dia — nesse caso só mostra "ausente hoje"
   no card da pessoa, sem mexer no horário do setor (fica por conta de
   alguém confirmar e, se for o caso, fechar manualmente pela aba
   "mudancas-horario"). */
function sintetizarFechamentosPorFalta(){
  var sinteticos = [];

  FALTAS.forEach(function(f){
    if(f.ativo === false) return;

    var pessoa = EQUIPE.filter(function(p){ return p.nome.trim() === f.pessoa; })[0];
    if(!pessoa) return;

    setoresDe(pessoa).forEach(function(setorId){
      var cobertura = EQUIPE.filter(function(p){
        return setoresDe(p).indexOf(setorId) !== -1;
      });
      if(cobertura.length !== 1) return;   /* mais de uma pessoa cobre esse setor */

      /* já existe um aviso manual pro mesmo setor no mesmo período? não duplica */
      var jaTem = AVISOS.some(function(a){
        return a.setor === setorId && a.inicio === f.inicio && (a.fim || a.inicio) === (f.fim || f.inicio);
      });
      if(jaTem) return;

      var setor = SETORES.filter(function(s){ return s.id === setorId; })[0];
      var nomeSetor = setor ? setor.nome : setorId;

      sinteticos.push({
        tipo:'fechado', setor:setorId,
        titulo: nomeSetor + ' não vai atender',
        texto: pessoa.nome + ' está ausente hoje' + (f.motivo ? ' (' + f.motivo + ')' : '') +
               '. Como é a única pessoa responsável por esse setor, não há atendimento.',
        inicio: f.inicio, fim: f.fim || f.inicio,
        novo:'', ativo:true
      });
    });
  });

  return sinteticos;
}

function situacao(s, diaKey, dataISO, agora){
  var av = avisoDe(s.id, dataISO);
  var padrao = s.h[diaKey];

  if(av && av.tipo === 'fechado')
    return {cls:'alerta', sinal:'✕', palavra:'Fechado hoje', faixa:padrao, nova:null, av:av};

  /* "horário alterado" só mexe num dia em que o setor atende de verdade: se o
     padrão daquele dia da semana está vazio (ex.: vacina no sábado), o aviso
     não o transforma em dia de atendimento. */
  var muda = !!(padrao && av && av.tipo === 'atencao' && av.novo);
  var f = muda ? av.novo : padrao;
  if(!f)
    return {cls:'off', sinal:'✕', palavra:'Não atende hoje', faixa:null, nova:null, av:null};

  /* f pode ter mais de um bloco no dia (ex: fecha pro almoço) — olha
     todos pra saber se está aberto agora, e qual é o próximo horário
     de abertura (pode ser depois do almoço, não só amanhã). */
  var blocos = f.split(',').map(function(b){
    var p = b.split('-');
    return {ini: mm(p[0]), fim: mm(p[1])};
  });
  var aberto = blocos.some(function(b){ return agora >= b.ini && agora < b.fim; });
  var proximaAbertura = null;
  blocos.forEach(function(b){
    if(agora < b.ini && (proximaAbertura === null || b.ini < proximaAbertura)) proximaAbertura = b.ini;
  });

  if(muda)
    return {
      cls: aberto ? 'atencao' : 'off',
      sinal: aberto ? '!' : '✕',
      palavra: aberto ? 'Aberto, com horário diferente hoje'
                      : (proximaAbertura !== null ? 'Abre às ' + hf(hh(proximaAbertura)) : 'Já fechou hoje'),
      faixa:padrao, nova:f, av:av
    };

  return {
    cls: aberto ? 'on' : 'off',
    sinal: aberto ? '✓' : '✕',
    palavra: aberto ? 'Aberto agora' : (proximaAbertura !== null ? 'Abre às ' + hf(hh(proximaAbertura)) : 'Já fechou hoje'),
    faixa:f, nova:null, av:null
  };
}

function proximoDia(s, data){
  for(var k = 1; k <= 7; k++){
    var d = new Date(data.getTime());
    d.setDate(d.getDate() + k);
    var key = K[d.getDay()];
    var a = avisoDe(s.id, iso(d));
    if(s.h[key] && (!a || a.tipo !== 'fechado'))
      return {key:key, faixa:s.h[key], amanha:(k === 1)};
  }
  return null;
}

/* Olha TODOS os setores (não só o primeiro da planilha) para decidir se
   a unidade está aberta. Fica aberta enquanto qualquer setor estiver
   funcionando, e "fecha" no horário do último setor a fechar no dia. */
function statusGeral(diaKey, dataISO, agora){
  var abertoAgora = false, fechaAs = null, abreAs = null;

  SETORES.forEach(function(s){
    var t = situacao(s, diaKey, dataISO, agora);
    if(t.cls === 'alerta') return;           /* setor fechado por aviso hoje */
    var faixa = t.nova || t.faixa;
    if(!faixa) return;                       /* setor não atende hoje */

    /* pode ter mais de um bloco no dia (ex: fecha pro almoço) */
    faixa.split(',').forEach(function(bloco){
      var partes = bloco.split('-');
      var ini = mm(partes[0]), fim = mm(partes[1]);

      if(agora >= ini && agora < fim){
        abertoAgora = true;
        if(fechaAs === null || fim > fechaAs) fechaAs = fim;
      } else if(agora < ini){
        if(abreAs === null || ini < abreAs) abreAs = ini;
      }
    });
  });

  return {abertoAgora:abertoAgora, fechaAs:fechaAs, abreAs:abreAs};
}

/* Mesma ideia do proximoDia, mas somando todos os setores — usada quando
   nenhum setor abre mais hoje, para saber a hora mais cedo entre todos
   no próximo dia que tiver algo funcionando. */
function proximaAberturaGeral(data){
  for(var k = 1; k <= 7; k++){
    var d = new Date(data.getTime());
    d.setDate(d.getDate() + k);
    var key = K[d.getDay()];
    var dISO = iso(d);
    var menor = null;

    SETORES.forEach(function(s){
      var av = avisoDe(s.id, dISO);
      if(av && av.tipo === 'fechado') return;
      var faixa = (s.h[key] && av && av.tipo === 'atencao' && av.novo) ? av.novo : s.h[key];
      if(!faixa) return;
      faixa.split(',').forEach(function(bloco){
        var ini = mm(bloco.split('-')[0]);
        if(menor === null || ini < menor) menor = ini;
      });
    });

    if(menor !== null) return {key:key, minutos:menor, amanha:(k === 1)};
  }
  return null;
}

/* Monta o link do botão "Como chegar" dos lugares de urgência. Aceita um
   link pronto (https://...) ou só o endereço por extenso, que vira uma busca
   no Google Maps — formato que abre tanto no Android quanto no iPhone. */
function linkDoMapa(valor){
  var v = String(valor == null ? '' : valor).trim();
  if(!v) return '';
  if(/^https?:\/\//i.test(v)) return v;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v);
}

/* Botão(ões) "Como chegar" de um lugar. O campo "mapa" do config pode ser:
   - um texto (link ou endereço) → um botão só; ou
   - uma lista, pra lugar que na verdade são dois endereços (ex: dois
     hospitais no mesmo item) → um botão por item. Aí cada item é
     { rotulo:'Hospital X', endereco:'Hospital X, Cidade - UF' } e o botão
     sai "Como chegar — Hospital X". */
var ULTIMA_DATA = null, ULTIMA_AGORA = null;

/* Transforma o carimbo do service worker em algo que se lê em voz alta sem
   pensar: "hoje às 16h", "ontem às 07h", ou a data cheia se for mais antigo. */
function quandoGuardado(carimbo){
  var d = new Date(carimbo);
  if(isNaN(d.getTime())) return 'da última vez que houve internet';
  var hora = d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  var hoje = new Date();
  var ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  if(iso(d) === iso(hoje))  return 'hoje às ' + hora;
  if(iso(d) === iso(ontem)) return 'ontem às ' + hora;
  return 'em ' + brData(iso(d)) + ' às ' + hora;
}

/* Monta o card de um aviso — usado tanto na lista de hoje quanto na de
   avisos futuros. "futuro" ajusta o tempo verbal da tarja ("Mudou" vs
   "Vai mudar") — sem isso, um aviso que ainda não começou ficaria
   dizendo que algo já aconteceu, o que é falso e pode confundir. */
function cartaoAviso(a, futuro){
  var cls  = a.tipo === 'atencao' ? 'atencao' : (a.tipo === 'recado' ? 'recado' : '');
  var selo = a.tipo === 'atencao' ? (futuro ? '⚠ Vai mudar o horário' : '⚠ Mudou o horário')
           : (a.tipo === 'recado' ? 'ⓘ Recado' : (futuro ? '✕ Vai fechar' : '✕ Fechado'));
  var per = a.inicio
    ? ((a.fim && a.fim !== a.inicio) ? 'De ' + brData(a.inicio) + ' até ' + brData(a.fim) : 'Dia ' + brData(a.inicio))
    : '';
  var rodape = [];
  if(per) rodape.push('Quando: ' + per);
  var quandoHtml = rodape.length ? '<p class="av-quando">' + rodape.join(' · ') + '</p>' : '';
  var textoHtml = (a.texto || a.novo)
    ? '<p class="av-texto">' +
        (a.texto ? limpo(a.texto) + (a.novo ? '<br>' : '') : '') +
        (a.novo ? 'Novo horário: <strong>' + fala(a.novo) + '</strong>.' : '') +
      '</p>'
    : '';
  return '<div class="aviso ' + cls + '">' +
    '<span class="av-tarja">' + selo + '</span>' +
    '<p class="av-titulo">' + limpo(a.titulo) + '</p>' +
    textoHtml +
    quandoHtml +
  '</div>';
}

/* ------------------------------------------------------------- EQUIPE -- */
function iniciaisDe(nome){
  return String(nome || '').trim().split(/\s+/).filter(Boolean).slice(0,2)
    .map(function(w){ var m = w.match(/[A-Za-zÀ-ÿ]/); return m ? m[0] : ''; })
    .join('').toUpperCase();
}

/* Aceita tanto um link completo (https://...) quanto só o nome do arquivo,
   caso em que a foto é procurada na pasta configurada em CONFIG.pastaFotos. */
function urlFoto(f){
  f = String(f || '').trim();
  if(!f) return '';
  if(/^https?:\/\//i.test(f)) return f;
  return '../paqueta/' + (CONFIG.pastaFotos || 'fotos/') + f;
}

/* Lista compacta: uma linha por pessoa (nome — função), que abre o painel
   de detalhe no clique. */
function agruparPorEquipe(lista){
  var temEquipes = lista.some(function(p){ return p.equipe && p.equipe.trim(); });
  if(!temEquipes) return [{ nome: null, pessoas: lista }];

  var mapa = {}, ordem = [];
  lista.forEach(function(p){
    var chave = (p.equipe && p.equipe.trim()) || 'Sem equipe definida';
    if(!mapa[chave]){ mapa[chave] = []; ordem.push(chave); }
    mapa[chave].push(p);
  });
  return ordem.map(function(nome){ return { nome: nome, pessoas: mapa[nome] }; });
}

/* ----------------------------------------------------------- minha rua -- */
/* A planilha já liga rua → equipe (aba "ruas") e equipe → turno (coluna
   "horario" da aba "equipe"). O que faltava era a direção que o morador
   usa de verdade: ele não sabe de que equipe é, ele sabe onde mora. Daqui
   até desenharMinhaRua() é essa busca invertida — rua digitada → equipe →
   horário → quem atende → falta de hoje —, sem pedir nenhuma coluna nova
   na planilha.

   A rua escolhida fica só no aparelho (localStorage), igual ao tamanho da
   letra: não vai pra planilha, nem pra medição de acesso, nem pra lugar
   nenhum. O site continua sem cookie e sem guardar nada que identifique
   alguém — que é a resposta que o projeto dá ao comitê de ética. */

/* Nome de rua digitado por gente de verdade não bate com o da planilha:
   vem sem acento, com "R." na frente, em maiúscula, com espaço a mais.
   Isso aqui reduz os dois lados à mesma forma antes de comparar.
   O trecho entre parênteses sai de propósito: ele é justamente o que
   diferencia dois PEDAÇOS da mesma rua ("Santa Cruz (semáforo até...)"),
   e os dois precisam cair na mesma opção de busca — quem mora lá tem que
   ver as duas equipes e escolher, em vez de o site chutar uma. */
function chaveRua(s){
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(rua|r|avenida|av|travessa|tv|servidao|estrada|rodovia|beco|alameda|praca|loteamento)\b\.?/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* Tira o trecho entre parênteses do nome ("Santa Cruz (semáforo...)" vira
   "Santa Cruz") e, do outro lado, devolve só o trecho. */
function ruaSemTrecho(rua){ return String(rua).replace(/\s*\(.*?\)\s*/g, ' ').trim(); }
function trechoDaRua(rua){
  var m = String(rua).match(/\(([^)]*)\)/);
  return m ? m[1].trim() : '';
}

/* Todas as ruas cadastradas, agrupadas pelo nome normalizado. Cada opção
   pode ter mais de um item (mais de uma equipe) — é o caso das ruas
   partidas em trechos, que aparecem uma vez em cada time. */
function opcoesDeRua(){
  var mapa = {}, ordem = [];
  (RUAS || []).forEach(function(a){
    (a.ruas || []).forEach(function(rua){
      var chave = chaveRua(rua);
      if(!chave) return;
      if(!mapa[chave]){
        mapa[chave] = { chave: chave, rotulo: ruaSemTrecho(rua), itens: [] };
        ordem.push(chave);
      }
      mapa[chave].itens.push({ rua: rua, equipe: a.equipe, trecho: trechoDaRua(rua) });
    });
  });
  ordem.sort();
  return ordem.map(function(c){ return mapa[c]; });
}

function opcaoDaRua(nome){
  var chave = chaveRua(nome);
  if(!chave) return null;
  var todas = opcoesDeRua();
  for(var i = 0; i < todas.length; i++){
    if(todas[i].chave === chave) return todas[i];
  }
  return null;
}

/* Busca por pedaço do nome, não por acerto exato: ninguém digita
   "Padre Antônio Eising" inteiro e certo. Quem COMEÇA com o que foi
   digitado vem primeiro — quem escreve "santa" quer "Santa Cruz" antes de
   "Rua de Santa Luzia". */
function acharRuas(texto){
  var q = chaveRua(texto);
  if(q.length < 2) return [];
  return opcoesDeRua()
    .filter(function(o){ return o.chave.indexOf(q) !== -1; })
    .sort(function(a, b){
      var pa = a.chave.indexOf(q) === 0 ? 0 : 1;
      var pb = b.chave.indexOf(q) === 0 ? 0 : 1;
      return pa - pb || a.chave.localeCompare(b.chave);
    });
}

/* Mesma regra do card "Quem trabalha aqui": o horário está preenchido em
   uma pessoa só (por convenção, a médica) e vale pro time inteiro. */
function pessoasDaEquipe(nomeEquipe){
  return (EQUIPE || []).filter(function(p){ return p.equipe === nomeEquipe; });
}
function horarioDaEquipe(nomeEquipe){
  var p = pessoasDaEquipe(nomeEquipe).filter(function(x){ return x.horario; })[0];
  return p ? p.horario : '';
}

/* "13h às 19h" vira {turno:'de tarde', texto:'das 13h às 19h'} — reaproveita
   o mesmo parser dos horários da planilha. Se o texto for estranho demais
   pra ele, devolve como veio e sem turno: melhor mostrar o que a planilha
   diz do que inventar "de manhã" em cima de um horário que não foi lido. */
function turnoDoHorario(horario){
  var f = normalizaHorario(horario);
  if(!f) return { turno:'', texto: horario };
  var blocos = f.split(',').map(function(b){
    var p = b.split('-');
    return {ini: mm(p[0]), fim: mm(p[1])};
  });
  var ini = Math.min.apply(null, blocos.map(function(b){ return b.ini; }));
  var fim = Math.max.apply(null, blocos.map(function(b){ return b.fim; }));
  var turno = fim <= 13*60 ? 'de manhã' : (ini >= 12*60 ? 'de tarde' : 'de manhã e de tarde');
  return { turno: turno, texto: fala(f) };
}

function telefoneDaUnidade(){
  var u = CONFIG.unidade;
  return '<a href="tel:' + limpo(u.telefoneLink) + '">' + limpo(u.telefone) + '</a>';
}

/* Um card por equipe que atende a rua escolhida. Quase sempre é um só;
   quando a rua é partida em trechos, saem dois. */
function textoParaOuvir(){
  if(ULTIMA_DATA == null) return '';
  var diaKey  = K[ULTIMA_DATA.getDay()];
  var dataISO = iso(ULTIMA_DATA);
  var partes = [CONFIG.unidade.nome + '.'];

  /* Quem está ouvindo a página não vê a tarja amarela de "sem internet" —
     e é justamente quem mais precisa saber que o horário na tela pode
     estar velho antes de sair de casa. */
  if(('onLine' in navigator) && navigator.onLine === false){
    partes.push('Atenção: você está sem internet. Esta informação pode estar ' +
                'desatualizada. Na dúvida, ligue para a UBS.');
  }

  var geral = statusGeral(diaKey, dataISO, ULTIMA_AGORA);
  if(geral.abertoAgora){
    partes.push('A UBS está aberta agora. Fecha hoje às ' + hf(hh(geral.fechaAs)) + '.');
  } else {
    partes.push('A UBS está fechada agora.');
  }

  /* Quem ouve a página não vê o card "Minha rua" — e é justamente quem mais
     precisa da resposta pronta, em vez de caçar a rua numa lista. */
  var minhaRua = RUA_ESCOLHIDA ? opcaoDaRua(RUA_ESCOLHIDA) : null;
  if(minhaRua){
    minhaRua.itens.forEach(function(i){
      var h = horarioDaEquipe(i.equipe);
      partes.push('Sua rua, ' + minhaRua.rotulo + ', é atendida pela ' + i.equipe +
                  (h ? ', que atende ' + turnoDoHorario(h).texto : '') + '.');
    });
  }

  var ativos = avisosDoDia(dataISO);
  if(!ativos.length){
    partes.push('Não há nenhum aviso hoje. Todos os setores funcionam no horário de sempre.');
  } else {
    partes.push(ativos.length === 1 ? 'Há um aviso hoje.' : 'Há ' + ativos.length + ' avisos hoje.');
    ativos.forEach(function(a){
      partes.push(a.titulo + '. ' + a.texto);
    });
  }

  partes.push('Em caso de urgência, ligue ' + CONFIG.urgencia.telefone.split('').join(' ') + '.');
  return partes.join(' ');
}

/* Monta o link que abre a página traduzida numa aba nova, pelo tradutor
   do Google — mais simples e confiável do que tentar controlar o widget
   deles na própria página, que muda de estrutura sem avisar. */
function linkTraducao(idiomaDestino){
  return 'https://translate.google.com/translate?sl=pt&tl=' + idiomaDestino +
    '&u=' + encodeURIComponent(location.href);
}

function guardar(chave, valor){
  try { localStorage.setItem(chave, valor); } catch(e){}
}
function lerGuardado(chave){
  try { return localStorage.getItem(chave); } catch(e){ return null; }
}

function textoContadorMudanca(){
  try{
    var atual = JSON.stringify({s:SETORES, a:AVISOS, e:EQUIPE, f:FALTAS, r:RUAS, m:REUNIOES});
    var anterior = lerGuardado('ubs-prototipo-a-conteudo-anterior');
    var hojeISO = iso(new Date());
    var dataMudanca = lerGuardado('ubs-prototipo-a-data-mudanca');

    if(atual !== anterior){
      guardar('ubs-prototipo-a-conteudo-anterior', atual);
      guardar('ubs-prototipo-a-data-mudanca', hojeISO);
      dataMudanca = hojeISO;
    }
    if(!dataMudanca) return '';

    var d1 = new Date(dataMudanca + 'T00:00:00');
    var d2 = new Date(hojeISO + 'T00:00:00');
    var dias = Math.round((d2 - d1) / 86400000);

    if(dias <= 0) return 'Última mudança detectada neste aparelho: hoje.';
    if(dias === 1) return 'Última mudança detectada neste aparelho: ontem.';
    return 'Última mudança detectada neste aparelho: há ' + dias + ' dias.';
  } catch(e){
    return '';
  }
}

/* Interface do protótipo. As regras acima são copiadas da Paquetá. */
var diaSelecionado=0, expandidos={}, ultimaLeitura=null, carregando=false;
var teste=new URLSearchParams(location.search).has('teste');
function el(id){return document.getElementById(id);}
function ic(nome){
 var paths={clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',users:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2M16 3a4 4 0 010 8M22 21v-2a4 4 0 00-3-4"/>',pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1116 0Z"/><circle cx="12" cy="10" r="3"/>',phone:'<path d="M22 17v3a2 2 0 01-2 2C10 22 2 14 2 4a2 2 0 012-2h3l2 6-2 2a16 16 0 007 7l2-2 6 2Z"/>',chev:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',wifi:'<path d="m2 2 20 20M8 16a6 6 0 018 0M12 20h.01M2 9a16 16 0 014-3M10 5a16 16 0 0112 4M5 13a10 10 0 015-3M17 11l2 2"/>'};
 return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[nome]||paths.clock)+'</svg>';
}
function cor(t){return t.nova?'a':(t.cls==='on'?'g':t.cls==='atencao'?'a':'r');}
function intervalos(s,data){var t=situacao(s,K[data.getDay()],iso(data),ULTIMA_AGORA||0);if(t.cls==='alerta')return [];return (t.nova||t.faixa||'').split(',').filter(Boolean).map(function(b){var p=b.split('-');return {ini:mm(p[0]),fim:mm(p[1]),mudou:!!t.nova,nome:s.nome};});}
function regua(data,agora,setor,labels){
 var todos=[];SETORES.forEach(function(s){todos=todos.concat(intervalos(s,data));});
 var ini=todos.length?Math.min.apply(null,todos.map(function(b){return b.ini;})):420;
 var fim=todos.length?Math.max.apply(null,todos.map(function(b){return b.fim;})):1140;
 if(fim<=ini)fim=ini+60;
 var blocos=setor?intervalos(setor,data):todos.slice().sort(function(a,b){return Number(a.mudou)-Number(b.mudou);});
 var html=blocos.map(function(b){return '<i class="'+(b.mudou?'a':'')+'" style="left:'+((b.ini-ini)/(fim-ini)*100)+'%;width:'+((b.fim-b.ini)/(fim-ini)*100)+'%"></i>';}).join('');
 if(iso(data)===iso(ULTIMA_DATA||new Date())&&agora>=ini&&agora<=fim)html+='<span class="now"></span>'.replace('class="now"','class="now" style="left:'+((agora-ini)/(fim-ini)*100)+'%"');
 if(labels)for(var i=0;i<5;i++){var v=Math.round((ini+(fim-ini)*i/4)/5)*5;html+='<span class="lab '+(i===0?'first':i===4?'last':'')+'" style="left:'+i*25+'%">'+hf(hh(v))+'</span>';}
 var descricao=blocos.length?blocos.map(function(b){return b.nome+': das '+hf(hh(b.ini))+' às '+hf(hh(b.fim))+(b.mudou?', horário alterado':'');}).join('; '):'Não há atendimento neste dia';
 return '<div class="regua '+(labels?'big':'')+'" role="img" aria-label="'+limpo(descricao)+'">'+html+'</div>';
}
function semana(s){
 var grupos=[];ORD.forEach(function(k){var h=s.h[k]||'';var g=grupos.filter(function(x){return x.h===h;})[0];if(!g){g={h:h,dias:[]};grupos.push(g);}g.dias.push(NOME[k]);});
 return '<div class="wk"><h4>A semana · horário habitual</h4>'+grupos.map(function(g){return '<div><span>'+g.dias.join(', ')+'</span><b>'+(g.h?fala(g.h):'Não atende')+'</b></div>';}).join('')+'</div>';
}
function estado(s,data,agora,hoje){var t=situacao(s,K[data.getDay()],iso(data),agora);if(!hoje)return t.cls==='alerta'?'Fechado neste dia':(t.nova||t.faixa)?fala(t.nova||t.faixa):'Não atende';var texto=t.palavra;if(t.cls==='on'||t.cls==='atencao')texto+=' · '+fala(t.nova||t.faixa);if(!t.faixa){var p=proximoDia(s,data);if(p)texto+=' · volta '+(p.amanha?'amanhã':CURTO[p.key]);}return texto;}
function renderSetores(){var data=somaDias(ULTIMA_DATA,diaSelecionado);var hoje=diaSelecionado===0;el('dias').innerHTML=Array.from({length:7},function(_,i){var d=somaDias(ULTIMA_DATA,i);return '<button data-dia="'+i+'" aria-pressed="'+(i===diaSelecionado)+'">'+(i===0?'Hoje':CURTO[K[d.getDay()]])+'<small>'+brData(iso(d)).slice(0,5)+'</small></button>';}).join('');
 el('lista-setores').innerHTML=SETORES.map(function(s,i){var t=situacao(s,K[data.getDay()],iso(data),ULTIMA_AGORA);return '<article class="card big"><button class="setor-toggle" data-setor="'+i+'" aria-expanded="'+!!expandidos[s.id]+'" aria-controls="detalhe-'+i+'">'+limpo(s.nome)+ic('down')+'</button><span class="tag '+cor(t)+'">'+estado(s,data,ULTIMA_AGORA,hoje)+'</span>'+regua(data,ULTIMA_AGORA,s,!!expandidos[s.id])+'<div id="detalhe-'+i+'" class="stack" '+(expandidos[s.id]?'':'hidden')+'><p>'+limpo(s.para)+'</p>'+(s.levar?'<p><b>Leve:</b> '+limpo(s.levar)+'</p>':'')+notasRecorrentesDoSetor(s.id,data).map(function(n){return '<p class="note">'+limpo(n)+'</p>';}).join('')+(t.av?'<p class="note">'+limpo(t.av.texto)+'</p>':'')+semana(s)+'<h4>Próximos dias</h4><div class="wk">'+Array.from({length:7},function(_,n){var d=somaDias(data,n);return '<div><span>'+NOME[K[d.getDay()]]+' '+brData(iso(d)).slice(0,5)+'</span><b>'+estado(s,d,ULTIMA_AGORA,false)+'</b></div>';}).join('')+'</div></div></article>';}).join('');
}
function fotoPessoa(p){var f=urlFoto(p.foto);return f?'<img class="av" src="'+limpo(f)+'" alt="" loading="lazy">':'<span class="av" aria-hidden="true">'+limpo(iniciaisDe(p.nome))+'</span>';}
function pessoa(p){var f=faltaDe(p.nome.trim(),iso(ULTIMA_DATA));return '<div class="pp">'+fotoPessoa(p)+'<div><b>'+limpo(p.nome)+'</b><small>'+limpo(p.funcao)+'</small>'+(p.obs?'<p class="sub">'+limpo(p.obs)+'</p>':'')+'</div>'+(f?'<span class="tag a">Não veio hoje'+(f.motivo?': '+limpo(f.motivo):'')+'</span>':'')+'</div>';}
function cartaoRuaEquipe(item,data,agora){
 var pessoas=pessoasDaEquipe(item.equipe),h=horarioDaEquipe(item.equipe),t=turnoDoHorario(h),quando;
 if(h)quando='<span class="tag g">'+limpo(h)+'</span><p>Atende '+(t.turno?'<strong>'+t.turno+'</strong>, ':'')+limpo(t.texto)+'</p>';
 else{if(!pessoas.length)console.error('minha rua: a aba "ruas" aponta para a equipe "'+item.equipe+'", que não existe na aba "equipe" — confira se o nome está igual, letra por letra.');quando='<p>O horário deste time ainda não está cadastrado. Ligue para a UBS para confirmar: '+telefoneDaUnidade()+'.</p>';}
 var ids={};pessoas.forEach(function(p){setoresDe(p).forEach(function(id){ids[id]=true;});});var fechados=SETORES.filter(function(s){return ids[s.id]&&situacao(s,K[data.getDay()],iso(data),agora).cls==='alerta';});
 return '<div class="rua-time"><h3>'+limpo(item.equipe)+'</h3>'+quando+(item.trecho?'<p>Atenção: só o trecho <strong>'+limpo(item.trecho)+'</strong>.</p>':'')+pessoas.map(pessoa).join('')+(fechados.length?'<p class="rua-fechado">⚠ Hoje '+fechados.map(function(s){return '<strong>'+limpo(s.nome)+'</strong>';}).join(' e ')+(fechados.length===1?' não está atendendo':' não estão atendendo')+'. <a href="#agora">Veja o aviso</a>.</p>':'')+'</div>';
}
function desenharMinhaRua(data,agora){
 el('busca-bloco').hidden=!(RUAS&&RUAS.length);if(!RUAS||!RUAS.length){el('rua-resposta').innerHTML='<p>Em breve, a lista de ruas atendidas. Ligue para a UBS: '+telefoneDaUnidade()+'.</p>';return;}
 if(!RUA_ESCOLHIDA){el('rua-resposta').innerHTML='';return;}var opcao=opcaoDaRua(RUA_ESCOLHIDA),trocar='<button id="rua-trocar">Ver outra rua</button>';
 if(!opcao){el('rua-resposta').innerHTML='<h2>'+limpo(RUA_ESCOLHIDA)+'</h2><p>Não encontrei mais esta rua na lista da unidade — a lista pode ter mudado. Ligue para a UBS: '+telefoneDaUnidade()+'.</p>'+trocar;return;}
 var idsTodos={};opcao.itens.forEach(function(i){pessoasDaEquipe(i.equipe).forEach(function(p){setoresDe(p).forEach(function(id){idsTodos[id]=true;});});});
 var nomes=SETORES.filter(function(s){return idsTodos[s.id];}).map(function(s){return '<strong>'+limpo(s.nome)+'</strong>';});
 var alvo=nomes.length?nomes.slice(0,-1).join(', ')+(nomes.length>1?' e ':'')+nomes[nomes.length-1]:'o atendimento com a sua equipe';
 var temHorario=opcao.itens.some(function(i){return horarioDaEquipe(i.equipe);});var deQuem=!temHorario?'':(opcao.itens.length>1?'Os horários acima são dos times e valem para ':'Este horário é o do seu time e vale para ')+alvo+'. ';
 el('rua-resposta').innerHTML='<h2>'+limpo(opcao.rotulo)+'</h2>'+(opcao.itens.length>1?'<p>Esta rua está dividida entre <strong>'+opcao.itens.length+' equipes</strong>. Veja em qual trecho fica a sua casa — na dúvida, ligue para a UBS: '+telefoneDaUnidade()+'.</p>':'')+opcao.itens.map(function(i){return cartaoRuaEquipe(i,data,agora);}).join('')+'<p class="rua-nota">'+deQuem+'Os outros setores da UBS atendem qualquer pessoa, cada um no seu horário — <a href="#setores">veja a lista de horários</a>.</p><p class="sub">Sua rua fica guardada só neste celular.</p>'+trocar;
}
function sugestoes(){var campo=el('rua-campo'),sug=el('rua-sugestoes');if(chaveRua(campo.value).length<2){sug.innerHTML='';return;}var a=acharRuas(campo.value);sug.innerHTML=a.length?a.slice(0,8).map(function(o){return '<button data-rua="'+limpo(o.rotulo)+'">'+limpo(o.rotulo)+'</button>';}).join('')+(a.length>8?'<p>Há mais '+(a.length-8)+' rua(s) parecida(s) — escreva mais um pedaço do nome.</p>':''):'<p>Não achei esta rua na lista. Ela pode estar escrita de outro jeito, ou ainda não ter sido cadastrada. Ligue para a UBS: '+telefoneDaUnidade()+'.</p>';}
function todasEquipes(){el('todas-equipes').innerHTML=agruparPorEquipe(EQUIPE||[]).map(function(g){var ruas=[];(RUAS||[]).forEach(function(r){if(r.equipe===g.nome)ruas=ruas.concat(r.ruas);});var h=g.nome?horarioDaEquipe(g.nome):'';return '<article class="card"><h3>'+limpo(g.nome||'Equipe da unidade')+'</h3>'+(h?'<span class="tag g">Atende '+limpo(h)+'</span>':'')+g.pessoas.map(pessoa).join('')+'<details data-preservar="equipe-'+limpo(g.nome)+'"><summary>'+ruas.length+' ruas atendidas</summary><ul>'+ruas.map(function(r){return '<li>'+limpo(r)+'</li>';}).join('')+'</ul></details></article>';}).join('')||'<p>Em breve, informações da equipe.</p>';}
function linkExterno(url,texto,cls){return '<a class="'+(cls||'btn t')+'" href="'+limpo(url)+'" target="_blank" rel="noopener">'+texto+'</a>';}
function mapas(m){if(!m)return '';return Array.isArray(m)?m.map(function(v){return linkExterno(linkDoMapa(v.endereco),'Como chegar — '+limpo(v.rotulo));}).join(''):linkExterno(linkDoMapa(m),'Como chegar');}
function tel(nome,numero,link){return '<div class="tel"><div><small>'+limpo(nome)+'</small><b>'+limpo(numero)+'</b></div><a class="call" href="tel:'+limpo(link||numero.replace(/[^+\d]/g,''))+'" aria-label="Ligar para '+limpo(nome)+': '+limpo(numero)+'">'+ic('phone')+'</a></div>';}
function montarOnde(){var u=CONFIG.unidade,ur=CONFIG.urgencia,uteis=CONFIG.telefonesUteis||[];el('onde').innerHTML='<article class="card big">'+(u.foto?'<img class="fachada" src="'+limpo(urlFoto(u.foto))+'" alt="Fachada da '+limpo(u.nome)+'" loading="lazy">':'')+'<h2>'+limpo(u.nome)+'</h2><p>'+limpo(u.endereco)+'<br>'+limpo(u.bairro)+'</p>'+(u.mapa?linkExterno(linkDoMapa(u.mapa),'Abrir o mapa no celular'):'')+'</article><h2>Telefones da unidade</h2>'+tel('Recepção',u.telefone,u.telefoneLink)+(u.telefoneEncaminhamentos?tel('Encaminhamentos · exames e consultas',u.telefoneEncaminhamentos,u.telefoneEncaminhamentosLink):'')+(u.secretaria?tel('Secretaria de Saúde',u.secretaria,u.secretariaLink):'')+(u.avisoLigacao?'<p class="note">'+limpo(u.avisoLigacao)+'</p>':'')+'<h2>Urgência</h2><div class="tel samu"><div><small>Ligue para o SAMU em caso grave</small><b>'+limpo(ur.telefone)+'</b></div><a class="call" href="tel:'+limpo(ur.telefone)+'" aria-label="Ligar para o SAMU">'+ic('phone')+'</a></div>'+(ur.lugares||[]).map(function(l){return '<article class="card"><h3>'+limpo(l.nome)+'</h3><p>'+limpo(l.det)+'</p><p class="st g">'+limpo(l.hora)+'</p>'+mapas(l.mapa)+'</article>';}).join('')+'<h2>Informações de saúde</h2>'+(CONFIG.informacoesSaude||[]).map(function(b,i){return '<details class="card" data-preservar="saude-'+i+'"><summary>'+limpo(b.titulo)+'</summary><ul>'+(b.itens||[]).map(function(v){return '<li>'+limpo(v)+'</li>';}).join('')+'</ul></details>';}).join('')+(uteis.length?'<h2>Outros telefones úteis</h2>'+uteis.slice(0,6).map(function(t){return tel(t.nome,t.telefone,t.telefoneLink);}).join('')+(uteis.length>6?'<details data-preservar="mais-telefones"><summary>Ver mais</summary><div class="stack">'+uteis.slice(6).map(function(t){return tel(t.nome,t.telefone,t.telefoneLink);}).join('')+'</div></details>':''):'')+(u.instagram?linkExterno(u.instagram,'Ver no Instagram'):'');}
function proveniencia(){var fd=el('fonte-dados');var hora=(ultimaLeitura||new Date()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 if(ORIGEM==='planilha'&&GUARDADO_EM)fd.textContent='Sem conexão com a planilha agora. Estes horários são os que ficaram guardados no aparelho '+quandoGuardado(GUARDADO_EM)+' — podem ter mudado desde então. Na dúvida, ligue para a UBS: '+CONFIG.unidade.telefone+'.';
 else if(ORIGEM==='planilha')fd.textContent=(AVISOS_DA_PLANILHA?'Horários e avisos carregados da planilha da unidade às ':'Horários carregados da planilha da unidade às ')+hora+(AVISOS_DA_PLANILHA?'.':'. As abas "mudancas-horario" e "recados" ainda não foram criadas.')+' '+textoContadorMudanca();
 else if(ORIGEM==='erro')fd.textContent='Não foi possível carregar a planilha agora. A página está mostrando '+(JA_LEU_A_PLANILHA?'os últimos horários que conseguiu ler dela.':'os horários fixos cadastrados no próprio site, que podem estar desatualizados.')+' Em caso de dúvida, ligue para a UBS: '+CONFIG.unidade.telefone+'.';
 else fd.textContent='Esta página está usando os dados internos do site. A planilha da unidade ainda não foi configurada.';
 el('unidades').hidden=!CONFIG.unidade.paginaUnidades;if(CONFIG.unidade.paginaUnidades)el('unidades').href=CONFIG.unidade.paginaUnidades;
}
function banner(){var antigo=navigator.onLine===false||ORIGEM==='erro'||!!GUARDADO_EM;el('banner').hidden=!antigo;el('banner').innerHTML=ic('wifi')+'<div>'+(ORIGEM==='erro'?'<b>Não conseguimos carregar os horários agora.</b> ':'')+'A informação pode estar desatualizada. Na dúvida, ligue para a UBS: '+telefoneDaUnidade()+'.</div>';}
function desenhar(data,agora){
 ULTIMA_DATA=data;ULTIMA_AGORA=agora;var d=iso(data),g=statusGeral(K[data.getDay()],d,agora),resto=g.fechaAs-agora,classe=g.abertoAgora?(resto<=60?'a':'g'):'r',titulo=g.abertoAgora?(resto<=60?'Fecha em '+resto+' min':'Aberta agora'):(!SETORES.some(function(s){return intervalos(s,data).length;})?'Fechada hoje':'Fechada agora');
 var texto;if(g.abertoAgora)texto='Fecha às '+hf(hh(g.fechaAs))+'. Ainda dá tempo: faltam '+(resto>=60?Math.floor(resto/60)+'h'+(resto%60?String(resto%60).padStart(2,'0'):''):resto+' min')+'.';
 else{var p=proximaAberturaGeral(data),f=feriadoInfo(d);texto=(f?f.nome+'. ':'')+(g.abreAs!==null?'Abre hoje às '+hf(hh(g.abreAs)):p?'Abre '+(p.amanha?'amanhã':'na '+CURTO[p.key])+' às '+hf(hh(p.minutos))+'.':'Ligue para a UBS para confirmar o próximo atendimento.');}
 var ativos=avisosDoDia(d);el('status').innerHTML='<div class="hero '+classe+'"><div class="when">'+NOME[K[data.getDay()]]+', '+data.getDate()+' de '+MESES[data.getMonth()]+' · '+hf(hh(agora))+'</div><div><h2>'+titulo+'</h2><p>'+limpo(texto)+'</p></div>'+regua(data,agora,null,true)+'<a class="btn w" href="tel:'+limpo(CONFIG.unidade.telefoneLink)+'">'+ic('phone')+'Ligar '+limpo(CONFIG.unidade.telefone)+'</a>'+(ativos.length?'<a href="#avisos">'+(ativos.length===1?'1 aviso hoje':ativos.length+' avisos hoje')+' · veja abaixo</a>':'')+'</div>';
 el('avisos').innerHTML=ativos.length?ativos.map(function(a){return cartaoAviso(a,false);}).join(''):'<p class="card">Hoje está tudo funcionando no horário de sempre. Nenhum setor fechado.</p>';
 el('atendendo').innerHTML=SETORES.map(function(s,i){var t=situacao(s,K[data.getDay()],d,agora);return '<a class="li" href="#setores" data-abrir="'+i+'"><span class="hd">'+limpo(s.nome)+ic('chev')+'</span><span class="st '+cor(t)+'">'+estado(s,data,agora,true)+'</span>'+regua(data,agora,s,false)+'</a>';}).join('');
 var futuros=avisosFuturos(d);el('futuros-bloco').hidden=!futuros.length;el('futuros').innerHTML=futuros.map(function(a){return '<div class="stack"><span class="tag '+(a.tipo==='fechado'?'r':'a')+'">'+brData(a.inicio)+'</span>'+cartaoAviso(a,true)+'</div>';}).join('');
 var abertos=Array.from(document.querySelectorAll('details[open][data-preservar]')).map(function(x){return x.dataset.preservar;});
 renderSetores();desenharMinhaRua(data,agora);todasEquipes();sugestoes();proveniencia();banner();
 document.querySelectorAll('details[data-preservar]').forEach(function(x){if(abertos.indexOf(x.dataset.preservar)!==-1)x.open=true;});
 document.title=CONFIG.unidade.nome+' — '+titulo;
}
function rota(){var aba=location.hash.slice(1);if(aba==='avisos'){aba='agora';}if(['agora','setores','equipe','onde'].indexOf(aba)===-1)aba='agora';['agora','setores','equipe','onde'].forEach(function(id){el(id).hidden=id!==aba;});document.querySelectorAll('.tabs a').forEach(function(a){if(a.hash==='#'+aba)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});var tit={agora:CONFIG.unidade.nome,setores:'Setores',equipe:'Minha equipe',onde:'Onde fica'};var sub={agora:CONFIG.unidade.bairro,setores:'O que você precisa hoje?',equipe:'Qual equipe atende a sua rua?',onde:'Endereço, telefones e urgência'};el('titulo').textContent=tit[aba];el('subtitulo').textContent=sub[aba];}
function atualizar(){if(teste){var p=el('data').value.split('-').map(Number);if(p.length===3&&p[0]&&p[1]&&p[2])desenhar(new Date(p[0],p[1]-1,p[2]),Number(el('hora').value));el('lbl').textContent=hf(hh(Number(el('hora').value)));}else{var d=new Date();desenhar(d,d.getHours()*60+d.getMinutes());}}
function refetch(){if(carregando)return;carregando=true;return buscarPlanilha().then(function(){if(ORIGEM==='planilha'&&!GUARDADO_EM)ultimaLeitura=new Date();atualizar();}).catch(function(e){console.error(e);ORIGEM='erro';atualizar();}).finally(function(){carregando=false;});}
function iniciar(){
 el('tabs').innerHTML=[['agora','clock','Agora'],['setores','grid','Setores'],['equipe','users','Minha equipe'],['onde','pin','Onde fica']].map(function(t){return '<a href="#'+t[0]+'"><span>'+ic(t[1])+'</span>'+t[2]+'</a>';}).join('');
 montarOnde();RUA_ESCOLHIDA=lerGuardado('ubs-prototipo-a-rua')||null;el('rua-campo').addEventListener('input',sugestoes);
 document.addEventListener('click',function(e){var b=e.target.closest('[data-dia],[data-setor],[data-abrir],[data-rua],#rua-trocar');if(!b)return;
 if(b.hasAttribute('data-dia')){diaSelecionado=Number(b.dataset.dia);renderSetores();el('dias').querySelector('[data-dia="'+diaSelecionado+'"]').focus();}
 if(b.hasAttribute('data-setor')){var s=SETORES[Number(b.dataset.setor)];expandidos[s.id]=!expandidos[s.id];renderSetores();el('lista-setores').querySelector('[data-setor="'+b.dataset.setor+'"]').focus();}
 if(b.hasAttribute('data-abrir')){diaSelecionado=0;expandidos[SETORES[Number(b.dataset.abrir)].id]=true;renderSetores();}
 if(b.hasAttribute('data-rua')){RUA_ESCOLHIDA=b.dataset.rua;guardar('ubs-prototipo-a-rua',RUA_ESCOLHIDA);el('rua-campo').value='';sugestoes();desenharMinhaRua(ULTIMA_DATA,ULTIMA_AGORA);el('rua-trocar').focus();}
 if(b.id==='rua-trocar'){RUA_ESCOLHIDA=null;guardar('ubs-prototipo-a-rua','');desenharMinhaRua(ULTIMA_DATA,ULTIMA_AGORA);el('rua-campo').focus();}
 });
 document.querySelectorAll('.tabs a').forEach(function(a){a.addEventListener('click',function(e){if(a.hash===location.hash){e.preventDefault();window.scrollTo(0,0);}});});
 window.addEventListener('hashchange',function(){rota();if(location.hash==='#avisos')el('avisos').scrollIntoView();else window.scrollTo(0,0);});rota();
 var sheet=el('acessibilidade');function fechar(){sheet.hidden=true;el('fundo').hidden=true;el('conteudo').inert=false;el('tabs').inert=false;el('aa').setAttribute('aria-expanded','false');document.body.style.overflow='';el('aa').focus();}
 el('aa').onclick=function(){sheet.hidden=false;el('fundo').hidden=false;el('conteudo').inert=true;el('tabs').inert=true;el('aa').setAttribute('aria-expanded','true');document.body.style.overflow='hidden';el('fechar').focus();};el('fechar').onclick=fechar;el('fundo').onclick=fechar;
 document.addEventListener('keydown',function(e){if(sheet.hidden)return;if(e.key==='Escape'){fechar();return;}if(e.key==='Tab'){var focus=Array.from(sheet.querySelectorAll('button,a[href],input')).filter(function(x){return !x.disabled;});var premier=focus[0],dernier=focus[focus.length-1];if(e.shiftKey&&(document.activeElement===premier||!sheet.contains(document.activeElement))){e.preventDefault();dernier.focus();}else if(!e.shiftKey&&(document.activeElement===dernier||!sheet.contains(document.activeElement))){e.preventDefault();premier.focus();}}});
 function tamanho(v){if(['1','1.15','1.3'].indexOf(v)===-1)v='1';document.documentElement.style.setProperty('--scale',v);el('tamanhos').querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.size===v));});guardar('ubs-prototipo-a-letra',v);}tamanho(lerGuardado('ubs-prototipo-a-letra')||'1');el('tamanhos').onclick=function(e){var b=e.target.closest('button');if(b)tamanho(b.dataset.size);};
 function contraste(v){document.documentElement.classList.toggle('alto-contraste',v);el('contraste').setAttribute('aria-pressed',String(v));guardar('ubs-prototipo-a-contraste',v?'1':'0');}contraste(lerGuardado('ubs-prototipo-a-contraste')==='1');el('contraste').onclick=function(){contraste(!document.documentElement.classList.contains('alto-contraste'));};
 el('idioma-en').href=linkTraducao('en');el('idioma-es').href=linkTraducao('es');
 el('ouvir').onclick=function(){if(!('speechSynthesis' in window)){el('a11y-aviso').textContent='Leitura não é possível neste navegador.';return;}if(speechSynthesis.speaking){speechSynthesis.cancel();el('ouvir').setAttribute('aria-pressed','false');return;}var f=new SpeechSynthesisUtterance((ORIGEM==='erro'||GUARDADO_EM?'Atenção: a informação pode estar desatualizada. Na dúvida, ligue para a UBS. ':'')+textoParaOuvir());f.lang='pt-BR';f.rate=.95;f.onend=f.onerror=function(){el('ouvir').setAttribute('aria-pressed','false');};el('ouvir').setAttribute('aria-pressed','true');speechSynthesis.speak(f);};
 el('libras').onclick=function(){if(document.getElementById('vlibras-script')){fechar();return;}var div=document.createElement('div');div.innerHTML='<div vw class="enabled"><div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div></div>';document.body.appendChild(div);var script=document.createElement('script');script.id='vlibras-script';script.src='https://vlibras.gov.br/app/vlibras-plugin.js';script.async=true;el('a11y-aviso').textContent='Carregando Libras…';script.onload=function(){if(window.VLibras){new window.VLibras.Widget('https://vlibras.gov.br/app');el('a11y-aviso').textContent='Tradutor de Libras disponível no botão lateral.';fechar();}};script.onerror=function(){script.remove();div.remove();el('a11y-aviso').textContent='Não foi possível carregar Libras. Confira sua conexão e tente novamente.';};document.body.appendChild(script);};
 var hoje=new Date();el('data').value=iso(hoje);el('hora').value=hoje.getHours()*60+hoje.getMinutes();if(teste){document.body.classList.add('com-teste');el('teste').hidden=false;}el('data').oninput=el('hora').oninput=atualizar;el('bt-agora').onclick=function(){var d=new Date();el('data').value=iso(d);el('hora').value=d.getHours()*60+d.getMinutes();atualizar();};
 atualizar();refetch();setInterval(function(){if(!teste)atualizar();},60000);setInterval(refetch,(CONFIG.recarregarACada||5)*60000);window.addEventListener('offline',banner);window.addEventListener('online',function(){banner();refetch();});document.addEventListener('visibilitychange',function(){if(!document.hidden){if(!teste)atualizar();refetch();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
