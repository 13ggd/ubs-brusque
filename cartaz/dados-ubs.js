/* ============================================================================
   DIRETÓRIO DAS UBS DE BRUSQUE
   ----------------------------------------------------------------------------
   Snapshot dos dados de identidade (endereço, telefone, site, planilha) que já
   estão em cada repo `13ggd/ubs-<slug>` hoje. Endereço e telefone foram
   confirmados no site oficial da Secretaria de Saúde de Brusque em 11/09/2026
   (substituindo os números de busca web genérica do dia anterior) — ver commit
   "config.js: endereço e telefone confirmados..." em qualquer um desses repos.
   Horário de cada setor NÃO está aqui: é buscado ao vivo na planilha de cada
   unidade (mesmo endpoint que o próprio site usa), porque isso muda com
   frequência normal — uma cópia estática viraria dado velho rápido.

   Se um desses campos mudar no config.js de algum repo, atualize a linha
   correspondente aqui à mão (não há build/script automático ainda).
   ========================================================================== */

var ORGAO_PADRAO = 'Prefeitura de Brusque · Secretaria de Saúde';

var UBS_BRUSQUE = [
  { slug:'ubs-aguas-claras',     nome:'UBS Águas Claras',     endereco:'R. Adelina Debatin, 124',            bairro:'Bairro Águas Claras — Brusque/SC',   telefone:'(47) 20170-507', site:'https://ubs-brusque.vercel.app/aguas-claras',     planilhaId:'1mou4IT6NjGcp4PFIpECp7aRsDQZJULTlWqITxn3c3R0' },
  { slug:'ubs-azambuja',         nome:'UBS Azambuja',         endereco:'R. Atílio Battistoti, 61',            bairro:'Bairro Azambuja — Brusque/SC',       telefone:'(47) 20170-511', site:'https://ubs-brusque.vercel.app/azambuja',         planilhaId:'1guUvQ8qhRiahT_LbWIoG9jOW4FIT2zaL3dy6gdQhNQ0' },
  { slug:'ubs-bateas',           nome:'UBS Bateas',           endereco:'R. Bertoldo Todt, 01',                bairro:'Bairro Bateas — Brusque/SC',         telefone:'(47) 20170-515', site:'https://ubs-brusque.vercel.app/bateas',           planilhaId:'1Wg67wYnKInaIGpZPHJfekHK4wvDeagksj1gHY7GsGrg' },
  { slug:'ubs-cedrinho',         nome:'UBS Cedrinho',         endereco:'Rua Ilda de Melo Kinis, s/n',         bairro:'Bairro Cedrinho — Brusque/SC',       telefone:'(47) 20170-518', site:'https://ubs-brusque.vercel.app/cedrinho',         planilhaId:'1ekhrgJneHLzU0NErDncaCxRrcBv5H_7mmG69XTsoFLc' },
  { slug:'ubs-centro',           nome:'UBS Centro',           endereco:'R. Pref. Germano Schaeffer, 66',      bairro:'Bairro Centro — Brusque/SC',         telefone:'(47) 20170-521', site:'https://ubs-brusque.vercel.app/centro',           planilhaId:'1KGVQf61jygJzHRSKvuZz7dvSyugk_kEJ9K47Ss8Ws4g' },
  { slug:'ubs-dom-joaquim',      nome:'UBS Dom Joaquim',      endereco:'R. Armando Pedro Maestri, 300',       bairro:'Bairro Dom Joaquim — Brusque/SC',    telefone:'(47) 20170-524', site:'https://ubs-brusque.vercel.app/dom-joaquim',      planilhaId:'1yxPU7qIQJ7hpucyZ_BQbqUtVNxwJwsBBriL_kU6XthQ' },
  { slug:'ubs-emma-ii',          nome:'UBS Emma II',          endereco:'R. Juvenal Vechi, 06',                bairro:'Bairro Santa Terezinha — Brusque/SC',telefone:'(47) 20170-527', site:'https://ubs-brusque.vercel.app/emma-ii',          planilhaId:'1WJSLhyTfXMoeJ_1cRL1Nm6i0xSHlE1Zc4qXNZOfQq4w' },
  { slug:'ubs-guarani',          nome:'UBS Guarani',          endereco:'R. Nicolau Hassman, 71',              bairro:'Bairro Guarani — Brusque/SC',        telefone:'(47) 20170-530', site:'https://ubs-brusque.vercel.app/guarani',          planilhaId:'1AriG6tiVcNaVcgvpa48mxJXMshn7jj53MyDzD8dXiLI' },
  { slug:'ubs-jardim-maluche',   nome:'UBS Jardim Maluche',   endereco:'Av. Dom Joaquim, 560',                bairro:'Bairro Jardim Maluche — Brusque/SC', telefone:'(47) 20170-541', site:'https://ubs-brusque.vercel.app/jardim-maluche',   planilhaId:'1Zq53hB5s3hL9hZK5aPdpAPKPJg-Vqiv-6EP-TA0jE3s' },
  { slug:'ubs-limeira',          nome:'UBS Limeira',          endereco:'R. Alberto Muller, 6640-7014',        bairro:'Bairro Limeira — Brusque/SC',        telefone:'(47) 20170-533', site:'https://ubs-brusque.vercel.app/limeira',          planilhaId:'1nKLTu5u6y4GiuO7UXE2GRKOUjHQrmizEInSkPCZ1dVI' },
  { slug:'ubs-limeira-alta',     nome:'UBS Limeira Alta',     endereco:'R. Alberto Muller, 6640-7014',        bairro:'Bairro Limeira — Brusque/SC',        telefone:'(47) 20170-538', site:'https://ubs-brusque.vercel.app/limeira-alta',     planilhaId:'1p9cpqf840rVkZ0YF9qVi-XI2a2sYmNv4EoZ4Nu97Olg' },
  { slug:'ubs-nova-brasilia',    nome:'UBS Nova Brasília',    endereco:'R. Osvaldo Niebuhr, 425',             bairro:'Bairro Nova Brasília — Brusque/SC',  telefone:'(47) 20170-545', site:'https://ubs-brusque.vercel.app/nova-brasilia',    planilhaId:'1LoFTxsQ9HRldh7LAmu5NXXpSgep8Hs5q3uuiNf86BX4' },
  { slug:'ubs-planalto',         nome:'UBS Planalto',         endereco:'R. Oito de Dezembro, 360',            bairro:'Bairro Santa Terezinha — Brusque/SC',telefone:'(47) 20170-551', site:'https://ubs-brusque.vercel.app/planalto',         planilhaId:'1VWdk9ib_2xgI6K74RF_trUvaFZlpxElaC79AYs2Vb6Q' },
  { slug:'ubs-poco-fundo',       nome:'UBS Poço Fundo',       endereco:'R. Poço Fundo, s/n',                  bairro:'Bairro Poço Fundo — Brusque/SC',     telefone:'(47) 20170-554', site:'https://ubs-brusque.vercel.app/poco-fundo',       planilhaId:'1bVOmXsx1xujTn1KDxkRAHdqs7lwA29B-Zuxp5UWTpYI' },
  { slug:'ubs-ponta-russa',      nome:'UBS Ponta Russa',      endereco:'R. Ponta Russa, 1328',                bairro:'Bairro Ponta Russa — Brusque/SC',    telefone:'(47) 20170-557', site:'https://ubs-brusque.vercel.app/ponta-russa',      planilhaId:'1l8JcZLzcSaXvdwhFxg3Orvw4dCkCqp5LrEh-ofG4iHI' },
  { slug:'ubs-rio-branco',       nome:'UBS Rio Branco',       endereco:'R. Marcio Haas',                      bairro:'Bairro Rio Branco — Brusque/SC',     telefone:'(47) 20170-560', site:'https://ubs-brusque.vercel.app/rio-branco',       planilhaId:'18zHGVanNssI37McJ0BMERgX3c9rz2Ivp7O9Yydx6jfM' },
  { slug:'ubs-rua-nova-trento',  nome:'UBS Rua Nova Trento',  endereco:'Rua Luiz Vanolli, 295',               bairro:'Bairro Azambuja — Brusque/SC',       telefone:'(47) 20170-563', site:'https://ubs-brusque.vercel.app/rua-nova-trento',  planilhaId:'1W83iRYMJKSU9c_zLor36HqFaRG_tiDoQ-4vQIgGrX2U' },
  { slug:'ubs-santa-luzia',      nome:'UBS Santa Luzia',      endereco:'R. Augusto Klapoth, 1306',            bairro:'Bairro Santa Luzia — Brusque/SC',    telefone:'(47) 20170-566', site:'https://ubs-brusque.vercel.app/santa-luzia',      planilhaId:'1GiKgIsk9JBEod45nGVP1MwL9GNaS-GCIWs8csgwW7pQ' },
  { slug:'ubs-santa-rita',       nome:'UBS Santa Rita',       endereco:'R. Olibio Barbi, 177',                bairro:'Bairro Santa Rita — Brusque/SC',     telefone:'(47) 20170-569', site:'https://ubs-brusque.vercel.app/santa-rita',       planilhaId:'1gBB8Iiy_Ov8BgbGEmkhQn2oIzKxYa8Si51t2gO7OYgY' },
  { slug:'ubs-santa-terezinha',  nome:'UBS Santa Terezinha',  endereco:'R. Santos Dumont, 1040',              bairro:'Bairro Santa Terezinha — Brusque/SC',telefone:'(47) 20170-572', site:'https://ubs-brusque.vercel.app/santa-terezinha',  planilhaId:'1KNr_3vaeO7GnMzr621TyumlNQwlWg_CqCJ63Fgb2_Yo' },
  { slug:'ubs-sao-joao',         nome:'UBS São João',         endereco:'R. Franciso Thives de Souza, sn',     bairro:'Bairro Cedro Alto — Brusque/SC',     telefone:'(47) 20170-576', site:'https://ubs-brusque.vercel.app/sao-joao',         planilhaId:'1E7Wgzd5WPbBQ0baBH2NLIG8ITQnGqcrwgoIKRzCpJJo' },
  { slug:'ubs-sao-luiz',         nome:'UBS São Luiz',         endereco:'R. Pedro Gracher, s/n',               bairro:'Bairro São Luiz — Brusque/SC',       telefone:'(47) 20170-579', site:'https://ubs-brusque.vercel.app/sao-luiz',         planilhaId:'1s7WGkVLDU87FJjsOspS_aigwb5FOML2jGhxUPt3EVfY' },
  { slug:'ubs-sao-pedro',        nome:'UBS São Pedro',        endereco:'R. Catarina Visconti Imhof, 121',     bairro:'Bairro São Pedro — Brusque/SC',      telefone:'(47) 20170-582', site:'https://ubs-brusque.vercel.app/sao-pedro',        planilhaId:'1t8-2rSaEs0I7bUmTBInTFhBPFwC8EiEJh7d-DjwDdQE' },
  { slug:'ubs-steffen',          nome:'UBS Steffen',          endereco:'R. Rodolfo Steffen, 212',             bairro:'Bairro Steffen — Brusque/SC',        telefone:'(47) 20170-585', site:'https://ubs-brusque.vercel.app/steffen',          planilhaId:'1oZ3KsOzcmdwh3HGue1X9bdImgJESJ6gETz7flqs7b3s' },
  { slug:'ubs-volta-grande',     nome:'UBS Volta Grande',     endereco:'Rua Alberto Michei, sn',              bairro:'Bairro Volta Grande — Brusque/SC',   telefone:'(47) 20170-588', site:'https://ubs-brusque.vercel.app/volta-grande',     planilhaId:'1ooAgCNoONvoRrcgv6BdYNXffKiplO8s4z_y35m_GpnQ' },
  { slug:'ubs-zantao',           nome:'UBS Zantão',           endereco:'Rua Arnoldo Ristow, S/N',             bairro:'Bairro Zantão — Brusque/SC',         telefone:'(47) 20170-591', site:'https://ubs-brusque.vercel.app/zantao',           planilhaId:'1RtHknfXkkbXK6FG-gGPGX_4nDwZsamaGe0RGrbJNg3o' }
];
