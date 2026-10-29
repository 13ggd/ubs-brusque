/* ===========================================================================
   AVISO DE MANUTENÇÃO
   Enquanto EM_MANUTENCAO for true, o site inteiro fica escondido atrás de um
   aviso de "em manutenção" (a equipe ainda está colocando os dados da UBS).

   >>> PARA LIBERAR O SITE: troque true por false na linha abaixo e publique.
       Nada mais precisa mudar. (Este arquivo não fica guardado no aparelho,
       então a liberação vale na hora para quem abrir o site.)
   =========================================================================== */
var EM_MANUTENCAO = true;

(function () {
  if (!EM_MANUTENCAO || /[?&]teste\b/.test(location.search)) return; // ?teste = bypass para a equipe

  var st = document.createElement('style');
  st.textContent =
    'body>*:not(#manutencao){display:none!important}' +
    '#manutencao{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
    'justify-content:center;padding:24px;background:#f6f7f4;color:#1c2b22;' +
    'font:18px/1.5 "Atkinson Hyperlegible",system-ui,sans-serif;text-align:center}' +
    '#manutencao div{max-width:30em}' +
    '#manutencao .m-ic{font-size:56px;line-height:1}' +
    '#manutencao h1{font-size:1.6em;margin:.4em 0 .3em}' +
    '#manutencao p{margin:.4em 0}' +
    '#manutencao .m-un{font-weight:700;color:#02301A}';
  document.head.appendChild(st);

  document.addEventListener('DOMContentLoaded', function () {
    var nome = (typeof CONFIG !== 'undefined' && CONFIG.unidade && CONFIG.unidade.nome) || 'Esta UBS';
    var el = document.createElement('div');
    el.id = 'manutencao';
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<div><div class="m-ic" aria-hidden="true">🛠️</div>' +
      '<p class="m-un"></p>' +
      '<h1>Site em manutenção</h1>' +
      '<p>Estamos atualizando as informações desta unidade. Em breve os horários, avisos e telefones estarão aqui.</p>' +
      '<p>Enquanto isso, procure a unidade pessoalmente ou ligue para a Secretaria de Saúde de Brusque.</p></div>';
    el.querySelector('.m-un').textContent = nome;
    document.body.appendChild(el);
  });
})();
