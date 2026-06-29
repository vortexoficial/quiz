# CHECK-UP LOJA LUCRATIVA

Sistema de diagnóstico multi-etapas (HTML + CSS + JavaScript puro), com persistência em `localStorage`.

> Captura de lead: **Google Apps Script** (`js/gas.js`, `window.GPSGASConfig`) — única integração ativa. As antigas integrações Firebase e EmailJS foram **removidas** (eram código morto, nunca acionadas no fluxo final).

## Como rodar

1. Abra o arquivo `index.html` no navegador (Chrome/Edge).
2. Preencha o passo 1 e avance pelas perguntas.
3. As respostas ficam salvas — se atualizar a página, o quiz continua do mesmo ponto.

> Observação: o quiz funciona normalmente mesmo sem internet. O envio do lead ao Google Apps Script é resiliente — acontece automaticamente ao concluir o diagnóstico e, se você estiver offline, fica pendente e é reenviado quando a conexão voltar.

## Estrutura

- `index.html`
- `css/styles.css`
- `js/ui.js` (render/efeitos de UI)
- `js/questions.js` (12 perguntas / 13 passos)
- `js/storage.js` (estado em `localStorage`)
- `js/app.js` (navegação + pontuação + tela final + envio do lead)
- `js/gas.js` (envio ao Google Apps Script)

## Estado salvo (localStorage)

Chave: `gps_diagnostico_state_v1`

Formato (base):

```json
{
  "step": 1,
  "answers": {
    "1": 2,
    "2": 1,
    "3": 0
  },
  "lead": {
    "nome": "",
    "empresa": "",
    "whatsapp": ""
  },
  "completed": false
}
```

## Captura de lead (Google Apps Script)

O resultado/lead é enviado a um Web App do Google Apps Script. Configure em `index.html`:

```js
window.GPSGASConfig = {
  webhookUrl: "https://script.google.com/macros/s/..../exec",
  token: "SEU_SECRET_TOKEN"
};
```

Comportamento:

- O envio acontece **automaticamente ao concluir o diagnóstico** (não depende do clique no CTA) e é **idempotente** (não duplica).
- Se não houver configuração, o sistema apenas faz `console.log` e segue normalmente.
- Se estiver offline, o lead fica pendente em `localStorage` e é reenviado no próximo carregamento ou quando a conexão voltar (evento `online`).

> ⚠️ **Segurança:** em site estático o `token` fica visível no código-fonte e **não autentica de verdade**. Rotacione-o periodicamente e proteja o endpoint **no próprio Apps Script** (validar Origin/Referer, limitar tamanho do payload, rate limiting / CAPTCHA). Trate o token apenas como filtro fraco anti-bot.
