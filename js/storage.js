/* Persistência em localStorage */

(function () {
  "use strict";

  const STORAGE_KEY = "gps_diagnostico_state_v1";
  const QUIZ_NAME = "Check-up K2 – Estrutura & Lucro";

  function defaultState() {
    return {
      quizName: QUIZ_NAME,
      step: 1,
      answers: {},
      lead: {
        nome: "",
        empresa: "",
        whatsapp: "",
      },
      completed: false,
      score: {
        total: 0,
        byOrgan: {
          cerebro: 0,
          coracao: 0,
          pulmao: 0,
          sangue: 0,
        },
      },
      levelKey: "",
      levelTitle: "",
      createdAt: "",
    };
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function sanitizeState(raw) {
    const base = defaultState();
    if (!isPlainObject(raw)) return base;

    const step = Number(raw.step);
    const safeStep = Number.isFinite(step) ? Math.floor(step) : 1;

    const answers = isPlainObject(raw.answers) ? raw.answers : {};
    const lead = isPlainObject(raw.lead) ? raw.lead : {};

    // Compatibilidade: versões antigas usavam {name,email,whatsapp,cidade}
    const legacyNome = typeof lead.name === "string" ? lead.name : "";
    const legacyWhatsapp = typeof lead.whatsapp === "string" ? lead.whatsapp : "";

    const out = {
      quizName: typeof raw.quizName === "string" && raw.quizName.trim() ? raw.quizName.trim() : QUIZ_NAME,
      step: safeStep,
      answers: {},
      lead: {
        nome: typeof lead.nome === "string" ? lead.nome : legacyNome,
        empresa: typeof lead.empresa === "string" ? lead.empresa : "",
        whatsapp: typeof lead.whatsapp === "string" ? lead.whatsapp : legacyWhatsapp,
      },
      completed: typeof raw.completed === "boolean" ? raw.completed : false,
      score: base.score,
      levelKey: typeof raw.levelKey === "string" ? raw.levelKey : "",
      levelTitle: typeof raw.levelTitle === "string" ? raw.levelTitle : "",
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
    };

    if (isPlainObject(raw.score)) {
      const total = Number(raw.score.total);
      const byOrgan = isPlainObject(raw.score.byOrgan) ? raw.score.byOrgan : {};
      out.score = {
        total: Number.isFinite(total) ? Math.floor(total) : 0,
        byOrgan: {
          cerebro: Number.isFinite(Number(byOrgan.cerebro)) ? Math.floor(Number(byOrgan.cerebro)) : 0,
          coracao: Number.isFinite(Number(byOrgan.coracao)) ? Math.floor(Number(byOrgan.coracao)) : 0,
          pulmao: Number.isFinite(Number(byOrgan.pulmao)) ? Math.floor(Number(byOrgan.pulmao)) : 0,
          sangue: Number.isFinite(Number(byOrgan.sangue)) ? Math.floor(Number(byOrgan.sangue)) : 0,
        },
      };
    }

    // Answers: manter apenas números finitos (1-based)
    for (const [key, value] of Object.entries(answers)) {
      const n = Number(value);
      if (Number.isFinite(n)) {
        out.answers[key] = Math.floor(n);
      }
    }

    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return sanitizeState(JSON.parse(raw));
    } catch {
      return defaultState();
    }
  }

  function save(state) {
    const sanitized = sanitizeState(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return sanitized;
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.GPSStorage = {
    STORAGE_KEY,
    QUIZ_NAME,
    defaultState,
    load,
    save,
    clear,
  };
})();
