# GPS Diagnóstico

Sistema de diagnóstico multi-etapas (HTML + CSS + JavaScript puro), com persistência em `localStorage`.

## Como rodar

1. Abra o arquivo `index.html` no navegador (Chrome/Edge).
2. Preencha o passo 1 e avance pelas perguntas.
3. As respostas ficam salvas — se atualizar a página, o quiz continua do mesmo ponto.

> Observação: por ser um projeto que roda via `file://`, algumas integrações externas dependem de internet (CDN). O quiz funciona normalmente mesmo sem configurar Firebase/EmailJS.

## Estrutura

- `index.html`
- `css/styles.css`
- `js/ui.js` (render/efeitos de UI)
- `js/questions.js` (12 perguntas / 13 passos)
- `js/storage.js` (estado em `localStorage`)
- `js/app.js` (navegação + pontuação + tela final)
- `js/firebase.js` (opcional)
- `js/email.js` (opcional)

## Estado salvo (localStorage)

Chave: `gps_diagnostico_state_v1`

Formato (base):

```json
{
  "step": 1,
  "answers": {
    "q1": 2,
    "q2": 1,
    "q3": 0
  },
  "lead": {
    "name": "",
    "email": "",
    "whatsapp": "",
    "cidade": ""
  },
  "completed": false
}
```

## Firebase (opcional)

A função exigida está disponível como:

- `saveLeadAndAnswers(data)` (global)
- `window.GPSFirebase.saveLeadAndAnswers(data)`

Para habilitar, defina `window.GPSFirebaseConfig` **antes** de clicar no botão da tela final:

```js
window.GPSFirebaseConfig = {
  firebaseConfig: {
    apiKey: "...",
    authDomain: "...",
    projectId: "..."
  },
  firestoreCollection: "gps_diagnostico_leads" // opcional
};
```

Se não estiver configurado, o sistema apenas faz `console.log` e segue normalmente.

## EmailJS (opcional)

A função exigida está disponível como:

- `sendResultEmail(data)` (global)
- `window.GPSEmail.sendResultEmail(data)`

Para habilitar, defina `window.GPSEmailJSConfig`:

```js
window.GPSEmailJSConfig = {
  publicKey: "...",
  serviceId: "...",
  templateId: "..."
};
```

Se não estiver configurado, o sistema apenas faz `console.log` e segue normalmente.
