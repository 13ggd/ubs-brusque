# Guia — publicar as UBS no domínio da Secretaria de Saúde

Objetivo: quando alguém clicar em **UBS Paquetá** (ou em qualquer outra
unidade) no site da Secretaria, abrir o site desta unidade **continuando no
domínio da Secretaria** — o endereço na barra fica algo como
`ubs.smsbrusque.sc.gov.br/paqueta/`, com cadeado (HTTPS).

Como isso é feito: **um único subdomínio** (ex: `ubs.smsbrusque.sc.gov.br`)
apontado, via **um único** registro de DNS (CNAME), para a Vercel, onde este
repositório está hospedado. Não é redirecionamento para outro endereço, não é
`<iframe>`, não é cópia do código para o servidor da Secretaria.

**Isso é feito uma vez só, para sempre.** O repositório é um monorepo — uma
pasta por UBS (`paqueta/`, e as que forem entrando depois) — publicado
como um único projeto na Vercel. Cada UBS nova vira só uma pasta a mais dentro
do mesmo subdomínio (`ubs.smsbrusque.sc.gov.br/<nova-unidade>/`): não gera
novo pedido de DNS, nem novo contato com o TI da Secretaria. O CNAME abaixo
não é "da UBS Paquetá" — é do projeto como um todo.

São duas partes:

- **Parte A** — o que a equipe do projeto faz (na Vercel e no código).
- **Parte B** — o que o setor de TI da Secretaria faz (um registro de DNS,
  uma única vez). Essa parte está escrita para ser recortada e enviada ao TI.

---

## Parte A — Equipe do projeto

### A1. Ter o repositório publicado na Vercel

Se já está publicado (ex: `ubs-brusque.vercel.app/` abre e mostra a lista de
unidades), pule para A2.

1. Conta em [vercel.com](https://vercel.com) — entre com o GitHub.
2. **Add New → Project** e importe o repositório `13ggd/ubs-brusque`.
3. Em *Framework Preset* escolha **Other**. Não preencha *Build Command* nem
   *Output Directory* — é site estático, não tem build.
4. **Deploy**. Ao terminar, confira que `https://<algum-nome>.vercel.app/`
   abre e mostra a lista de unidades, e que
   `https://<algum-nome>.vercel.app/paqueta/` abre o site da unidade.

### A2. Adicionar o subdomínio único da Secretaria na Vercel

Este passo é feito **uma vez**, não por UBS.

1. No projeto: **Settings → Domains**.
2. No campo, escreva o subdomínio escolhido (ex: `ubs.smsbrusque.sc.gov.br`)
   e clique **Add**.
3. A Vercel vai mostrar um aviso de *"Invalid Configuration"* e, junto, **o
   registro DNS que precisa ser criado** — algo como:

   > Type: `CNAME`  ·  Name: `ubs`  ·  Value: `cname.vercel-dns.com`

   O `Value` às vezes vem com um nome mais específico (ex:
   `xxxxxxxx.vercel-dns-017.com`). **Copie exatamente o que o painel mostrar** —
   é isso que vai no e-mail para o TI (Parte B).

### A3. Enviar a Parte B para o setor de TI da Secretaria

Copie a Parte B deste guia num e-mail ou chamado, **substituindo o valor do
CNAME** pelo que a Vercel mostrou no passo A2.

### A4. Esperar ficar verde

Depois que o TI criar o registro (pode levar de alguns minutos a algumas horas):

- Na Vercel, **Settings → Domains**, o domínio passa a **"Valid Configuration"**.
- A Vercel emite sozinha o certificado HTTPS (Let's Encrypt) — sem ninguém pedir.
- Teste, para cada UBS já publicada:
  - `https://ubs.smsbrusque.sc.gov.br/` mostra a lista de unidades;
  - `https://ubs.smsbrusque.sc.gov.br/paqueta/` abre o site da UBS Paquetá,
    com o cadeado e sem aviso de segurança;
  - `https://ubs.smsbrusque.sc.gov.br/paqueta/?teste` abre a barra de teste;
  - desligue a internet e recarregue — o site ainda abre (modo offline).

### A5. Ajustar o código de cada UBS para o endereço definitivo

Com `ubs.smsbrusque.sc.gov.br` funcionando, edite **dentro da pasta de cada
UBS** (ex: `paqueta/`):

| Arquivo | O que mudar |
|---|---|
| `config.js` | Em `unidade.site`, escreva `'https://ubs.smsbrusque.sc.gov.br/paqueta'` (sem barra no final). É de onde sai o QR code do cartaz impresso. |
| `index.html` | No bloco *Open Graph* (topo do arquivo), troque o endereço atual por `https://ubs.smsbrusque.sc.gov.br/paqueta/` nas linhas `og:url`, `og:image` e `twitter:image`. É o que aparece quando colam o link no WhatsApp. |
| `sw.js` | Aumente o número em `VERSAO` (sempre o próximo, o que estiver lá no momento — ex: `ubs-v11` → `ubs-v12`). É o que faz o navegador de quem já visitou baixar a versão nova. |

Isso é feito **uma vez por UBS** (é parte do trabalho normal de publicar uma
UBS nova, junto com o `config.js` — não é um passo extra ligado ao domínio).

Depois: `git commit` + `git push`. A Vercel republica sozinha.

### A6. Fechar o ciclo (por UBS)

- **Reimprima o cartaz** (`paqueta/cartaz.html`) — o QR agora aponta para
  o endereço definitivo. Jogue fora os cartazes antigos com o endereço
  `.vercel.app`.
- **Peça ao pessoal da Secretaria** que, no link do site deles para esta
  unidade, deixe o endereço assim:
  `https://ubs.smsbrusque.sc.gov.br/paqueta/?de=sms`
  O `?de=sms` faz a medição de acessos contar quantas pessoas chegaram por ali,
  separado de quem chegou pelo cartaz (`?de=cartaz`) ou pelo bilhete (`?de=bilhete`).

### A7. Adicionando uma UBS nova depois

Nenhuma etapa abaixo passa pelo TI da Secretaria de novo — o CNAME já está
resolvido desde a Parte B.

1. Copie a pasta de uma UBS existente (ex: `paqueta/`) para
   `<nova-unidade>/`, dentro do mesmo repositório.
2. Edite o `config.js` da cópia (ver `README.md` — seção "Replicando para
   outra UBS").
3. Já preencha `unidade.site` com
   `'https://ubs.smsbrusque.sc.gov.br/<nova-unidade>'` e o bloco Open
   Graph do `index.html` da pasta nova com o mesmo endereço — não precisa
   passar pelo endereço `.vercel.app` provisório, já que o subdomínio já
   existe.
4. Acrescente um link para a pasta nova no `index.html` da raiz do
   repositório (a lista de unidades).
5. `git commit` + `git push`.

### A8. Continuidade (quando o semestre acabar)

O site fica no ar de graça na Vercel enquanto a conta existir e o repositório
no GitHub existir. Se o projeto for entregue para a Secretaria manter, o TI pode:

- criar uma conta própria na Vercel e importar o mesmo repositório
  (`13ggd/ubs-brusque`), ou um *fork* dele; e
- refazer o passo A2 nessa conta nova.

O registro de DNS da Parte B continua valendo — só troca para qual conta da
Vercel ele aponta, se o `Value` do CNAME mudar.

---

## Parte B — Setor de TI da Secretaria de Saúde

*(Esta parte pode ser recortada e enviada ao TI.)*

### O que é

Um site estático (só HTML/CSS/JavaScript) de horários e avisos das unidades
básicas de saúde do município, hospedado na **Vercel**, mantido pela equipe
do projeto. O código-fonte é público: `https://github.com/13ggd/ubs-brusque`

Cada UBS participante ganha seu próprio endereço dentro de um único
subdomínio (ex: `ubs.smsbrusque.sc.gov.br/paqueta/`,
`ubs.smsbrusque.sc.gov.br/<outra-unidade>/`) — **isso é o motivo de o
pedido abaixo ser feito só uma vez**: novas unidades que entrarem no projeto
depois não vão exigir um novo registro de DNS, só ganham um caminho novo
dentro do mesmo subdomínio.

### O que precisamos de vocês: **um registro de DNS**

Na zona DNS de `smsbrusque.sc.gov.br`, criar:

| Campo | Valor |
|---|---|
| **Tipo** | `CNAME` |
| **Nome / Host** | `ubs` *(alguns painéis pedem o nome completo: `ubs.smsbrusque.sc.gov.br`)* |
| **Aponta para / Destino / Target** | `cname.vercel-dns.com` *(← confirmar com a equipe do projeto: a Vercel pode fornecer um valor um pouco diferente para este projeto)* |
| **TTL** | padrão / automático (3600) |
| **Proxy** | se o DNS estiver na Cloudflare: **desligado** ("DNS only", nuvem cinza) — pelo menos até o certificado HTTPS ser emitido |

Só isso. Depois de criado, avisem a equipe do projeto — a emissão do
certificado HTTPS é automática (Let's Encrypt, feita pela Vercel) e leva de
minutos a poucas horas.

### O que **não** é necessário

- **Não** precisa registro `A` nem `AAAA` — é subdomínio, CNAME resolve.
- **Não** precisa configurar proxy reverso, `rewrite` ou `redirect` no servidor
  de vocês — as UBS aparecem como pastas dentro do próprio subdomínio, isso é
  resolvido do lado da Vercel.
- **Não** precisa emitir nem instalar certificado do lado de vocês.
- **Não** encosta no site principal `smsbrusque.sc.gov.br` — é um subdomínio
  novo e isolado.
- **Não** precisa de um novo registro a cada nova UBS que entrar no projeto —
  este único CNAME serve para todas, atuais e futuras.

### Como verificar do lado de vocês

```
nslookup -type=CNAME ubs.smsbrusque.sc.gov.br
```

Deve retornar o destino `...vercel-dns...`. Propagação costuma ser rápida
(minutos), mas pode levar algumas horas.

### Como desfazer

Basta **apagar o registro CNAME**. O subdomínio para de resolver — e junto
com ele, todas as UBS publicadas ali — e nada mais é afetado: o domínio
principal e os outros subdomínios continuam iguais.

### Privacidade / conformidade

O site não usa cookies e não coleta nenhum dado pessoal (sem nome, telefone,
IP salvo ou rastreamento entre sites) — por isso não tem aviso de cookies. A
contagem de acessos, quando ligada, é anônima e agregada, e é configurada
por UBS. Código aberto para auditoria no GitHub acima.

---

## Resumo em uma linha

**Vocês (projeto):** publicam o repositório na Vercel e adicionam **um**
subdomínio (`ubs.smsbrusque.sc.gov.br`) no painel.
**TI da Secretaria:** cria **um** registro `CNAME` `ubs` → `cname.vercel-dns.com`
— uma única vez, para todas as UBS atuais e futuras.
**Resultado:** cada UBS abre em `ubs.smsbrusque.sc.gov.br/<nome>/`, com
HTTPS, no domínio da Secretaria — e adicionar uma UBS nova não depende mais
do TI.
