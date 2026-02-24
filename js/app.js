/* Orquestração do quiz (navegação + persistência)
 * Regras:
 * - 13 passos visuais (1 lead + 12 perguntas)
 * - Passo 1: lead (com botão Continuar)
 * - Passos 2..13: perguntas com alternativas clicáveis (sem botão continuar)
 * - Clique em alternativa: salva + avança automaticamente
 * - Botão "< Voltar" no canto inferior esquerdo
 * - Persistência total em localStorage (resiste a refresh)
 */

(function () {
  "use strict";

  const QUIZ_NAME = "Check-up K2 – Estrutura & Lucro";

  function onlyDigits(value) {
    return String(value || "").replace(/\D+/g, "");
  }

  function formatWhatsappBR(value) {
    const digits = onlyDigits(value).slice(0, 11); // DDD + 9 + 4
    if (!digits) return "";

    // (DD) 00000-0000
    const ddd = digits.slice(0, 2);
    const part1 = digits.slice(2, 7);
    const part2 = digits.slice(7, 11);

    if (digits.length <= 2) return `(${ddd}`;
    if (digits.length <= 7) return `(${ddd}) ${digits.slice(2)}`;
    if (digits.length <= 11 && !part2) return `(${ddd}) ${part1}`;
    return `(${ddd}) ${part1}-${part2}`;
  }

  function isValidWhatsappBR(value) {
    return onlyDigits(value).length === 11;
  }

  function getTotalSteps() {
    // 1 (lead) + N perguntas
    if (window.GPSQuestions && typeof window.GPSQuestions.getTotalSteps === "function") {
      const n = Number(window.GPSQuestions.getTotalSteps());
      if (Number.isFinite(n) && n > 1) return Math.floor(n);
    }
    // fallback
    return 13;
  }


  const ORGAN_UI = {
    cerebro: {
      key: "cerebro",
      label: "Cérebro",
      subtitle: "Liderança, Direção e Expansão",
      icon: "brain",
      className: "organ-chip--cerebro",
      badgeClass: "organ-badge--cerebro"
    },
    coracao: {
      key: "coracao",
      label: "Coração",
      subtitle: "Cultura, Equipe e Performance",
      icon: "heart",
      className: "organ-chip--coracao",
      badgeClass: "organ-badge--coracao"
    },
    pulmao: {
      key: "pulmao",
      label: "Pulmão",
      subtitle: "Vendas, margem e lucro",
      icon: "pulmao",
      className: "organ-chip--pulmao",
      badgeClass: "organ-badge--pulmao"
    },
    sangue: {
      key: "sangue",
      label: "Sangue",
      subtitle: "Processos, Padronização e Experiência",
      icon: "droplet",
      className: "organ-chip--sangue",
      badgeClass: "organ-badge--sangue"
    },
  };

  function renderLucideOrPulmaoIcon(iconName) {
    if (String(iconName || "") === "pulmao") {
      return '<img class="pulmao-icon" src="./assets/pulmao.png" alt="" aria-hidden="true" />';
    }
    return `<i data-lucide="${escapeAttr(iconName)}"></i>`;
  }

  function getOrganUIFromQuestion(question, questionNumber) {
    const fromProp = question && typeof question.organ === "string" ? question.organ : "";
    if (fromProp && Object.prototype.hasOwnProperty.call(ORGAN_UI, fromProp)) return ORGAN_UI[fromProp];

    const qn = Number(questionNumber);
    if (qn >= 1 && qn <= 3) return ORGAN_UI.cerebro;
    if (qn >= 4 && qn <= 6) return ORGAN_UI.coracao;
    if (qn >= 7 && qn <= 9) return ORGAN_UI.pulmao;
    return ORGAN_UI.sangue;
  }

  const state = {
    step: 1,
    answers: {},
    lead: {
      nome: "",
      empresa: "",
      whatsapp: "",
    },
    completed: false,
  };

  function isLeadComplete(lead) {
    if (!lead) return false;
    return Boolean(
      String(lead.nome || "").trim() &&
        String(lead.empresa || "").trim() &&
        String(lead.whatsapp || "").trim()
    );
  }

  function normalizeStep(step) {
    const s = Number(step);
    const safe = Number.isFinite(s) ? Math.floor(s) : 1;
    const total = getTotalSteps();
    // Permite Step 0 (tela inicial) sem alterar a lógica do quiz (steps 1..total)
    return Math.min(Math.max(safe, 0), total);
  }

  function loadState() {
    const persisted = window.GPSStorage.load();

    state.step = normalizeStep(persisted.step);
    state.answers = persisted.answers || {};
    state.lead = persisted.lead || state.lead;

    // Novo fluxo visual: se for um "primeiro acesso" (sem lead e sem respostas), inicia no Step 0.
    const isFreshSession =
      state.step === 1 &&
      !isLeadComplete(state.lead) &&
      Object.keys(state.answers || {}).length === 0 &&
      persisted &&
      persisted.completed !== true;
    if (isFreshSession) {
      state.step = 0;
    }

    // Se pulou pro meio sem lead completo, volta para o passo 1.
    if (state.step > 1 && !isLeadComplete(state.lead)) {
      state.step = 1;
    }

    // completed é opcional; se existir e for booleano, preserva
    if (persisted && typeof persisted.completed === "boolean") {
      state.completed = persisted.completed;
    }
  }

  function persist() {
    // Mantém navegação/persistência e também salva os campos finais do diagnóstico quando existirem.
    const existing = window.GPSStorage.load();
    window.GPSStorage.save({
      ...existing,
      quizName: QUIZ_NAME,
      step: state.step,
      answers: state.answers,
      lead: state.lead,
      completed: state.completed,
    });
  }

  function setStep(nextStep) {
    state.step = normalizeStep(nextStep);
    state.completed = false;
    persist();
    window.GPSUI.setStep(state.step, getTotalSteps());
    render();
  }

  function goBack() {
    if (state.step <= 0) return;

    // Lead (1) volta para a tela inicial (0)
    if (state.step === 1) {
      setStep(0);
      return;
    }

    // A tela de "Concluído" não conta como um passo separado;
    // voltar daqui deve reabrir a última pergunta (passo 11).
    if (state.step === getTotalSteps() && state.completed) {
      state.completed = false;
      persist();
      render();
      return;
    }

    state.completed = false;
    setStep(state.step - 1);
  }

  function renderLayout({ title, bodyHtml, showBack }) {
    const backButtonHtml = showBack
      ? `<button class="nav__back" type="button" id="backBtn" aria-label="Voltar">&lt; Voltar</button>`
      : `<span class="nav__spacer" aria-hidden="true"></span>`;

    const titleHtml = String(title || "").trim() ? `<h1 class="h1">${title}</h1>` : ``;

    const html = `
      <div class="step">
        ${titleHtml}
        ${bodyHtml}

        <div class="nav" aria-label="Navegação">
          ${backButtonHtml}
        </div>
      </div>
    `.trim();

    window.GPSUI.setContent(html);

    if (showBack) {
      const backBtn = document.getElementById("backBtn");
      if (backBtn) backBtn.addEventListener("click", goBack);
    }
  }

  function renderWelcomeStep() {
    const organs = [ORGAN_UI.cerebro, ORGAN_UI.coracao, ORGAN_UI.pulmao, ORGAN_UI.sangue];
    const organGridHtml = organs
      .map((o) => {
        // Usa a classe específica do órgão (ex: organ-chip--cerebro)
        const modifierClass = o.className ? ` ${o.className}` : "";
        return `
          <div class="organ-chip${modifierClass}" role="listitem">
            <div class="organ-chip__icon" aria-hidden="true">${renderLucideOrPulmaoIcon(o.icon)}</div>
            <div class="organ-chip__body">
              <div class="organ-chip__name">${escapeHtml(o.label)}</div>
              <div class="organ-chip__desc">${escapeHtml(o.subtitle)}</div>
            </div>
          </div>
        `.trim();
      })
      .join("");

    const bodyHtml = `
      <div class="welcome">
        <h2 class="welcome__title">Bem vindo ao ${escapeHtml(QUIZ_NAME)}</h2>
        <p class="welcome__subtitle">Agora vamos analisar os 4 órgãos vitais da sua empresa:</p>

        <div class="organ-chip-grid" role="list" aria-label="Pilares do diagnóstico">
          ${organGridHtml}
        </div>

        <p class="welcome__note">Seu diagnóstico será gerado automaticamente ao final.</p>

        <div class="welcome__actions">
          <button class="btn btn--primary" type="button" id="startBtn">Iniciar Check-up</button>
        </div>
      </div>
    `.trim();

    renderLayout({
      title: "",
      bodyHtml,
      showBack: false,
    });

    const startBtn = document.getElementById("startBtn");
    if (startBtn) {
      startBtn.addEventListener("click", function () {
        setStep(1);
      });
    }
  }

  function renderLeadStep() {
    const lead = state.lead || {};

    // Modificado para usar estrutura de Floating Label
    // O input vem antes do span.field__label e usamos :placeholder-shown no CSS
    const bodyHtml = `
      <p class="lead">Preencha seus dados para receber o diagnóstico.</p>

      <form class="form" id="leadForm" novalidate>
        <div class="grid">
          <label class="field floating-label">
            <input class="field__input" name="nome" autocomplete="name" inputmode="text" placeholder=" " value="${escapeAttr(
              lead.nome || ""
            )}" required />
            <span class="field__label">Nome</span>
          </label>

          <label class="field floating-label">
            <input class="field__input" name="empresa" autocomplete="organization" inputmode="text" placeholder=" " value="${escapeAttr(
              lead.empresa || ""
            )}" required />
            <span class="field__label">Empresa</span>
          </label>

          <label class="field floating-label">
            <input class="field__input" type="tel" name="whatsapp" autocomplete="tel" inputmode="tel" placeholder=" " value="${escapeAttr(
              lead.whatsapp || ""
            )}" maxlength="15" required />
            <span class="field__label">WhatsApp</span>
          </label>
        </div>

        <div class="form__footer">
          <p class="form__hint" id="leadHint" aria-live="polite"></p>
          <button class="btn btn--primary" type="submit">Continuar</button>
        </div>
      </form>
    `.trim();

    renderLayout({
      title: QUIZ_NAME,
      bodyHtml,
      showBack: true,
    });

    const form = document.getElementById("leadForm");
    const hint = document.getElementById("leadHint");

    if (!form) return;

    // Máscara WhatsApp: apenas números + formatação (DD) 00000-0000
    const whatsappInput = form.querySelector('input[name="whatsapp"]');
    if (whatsappInput) {
      // Normaliza valor inicial (ex.: vindo do localStorage)
      whatsappInput.value = formatWhatsappBR(whatsappInput.value);

      whatsappInput.addEventListener("input", function () {
        const formatted = formatWhatsappBR(whatsappInput.value);
        if (whatsappInput.value !== formatted) {
          whatsappInput.value = formatted;
        }
      });

      whatsappInput.addEventListener("blur", function () {
        whatsappInput.value = formatWhatsappBR(whatsappInput.value);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const formData = new FormData(form);
      const nextLead = {
        nome: String(formData.get("nome") || "").trim(),
        empresa: String(formData.get("empresa") || "").trim(),
        whatsapp: formatWhatsappBR(String(formData.get("whatsapp") || "").trim()),
      };

      const validation = validateLead(nextLead);
      if (!validation.ok) {
        if (hint) hint.textContent = validation.message;
        return;
      }

      state.lead = nextLead;
      state.step = 2;
      persist();

      window.GPSUI.setStep(state.step, getTotalSteps());
      render();
    });
  }

  function validateLead(lead) {
    if (!String(lead.nome || "").trim()) return { ok: false, message: "Informe seu nome." };
    if (!String(lead.empresa || "").trim()) return { ok: false, message: "Informe sua empresa." };
    if (!String(lead.whatsapp || "").trim()) return { ok: false, message: "Informe seu WhatsApp." };
    if (!isValidWhatsappBR(lead.whatsapp)) return { ok: false, message: "Informe seu WhatsApp no formato (DD) 00000-0000." };
    return { ok: true, message: "" };
  }

  function calculateScore(answers) {
    const byOrgan = {
      cerebro: 0,
      coracao: 0,
      pulmao: 0,
      sangue: 0,
    };

    const questions = window.GPSQuestions && Array.isArray(window.GPSQuestions.QUESTIONS) ? window.GPSQuestions.QUESTIONS : [];
    const answerMap = answers && typeof answers === "object" ? answers : {};

    let total = 0;
    for (const q of questions) {
      const key = String(q.id);
      const points = Number(answerMap[key]);
      if (!Number.isFinite(points)) continue;
      const p = Math.min(Math.max(Math.floor(points), 0), 2);
      total += p;
      if (q.organ && Object.prototype.hasOwnProperty.call(byOrgan, q.organ)) {
        byOrgan[q.organ] += p;
      }
    }

    // teto por órgão: 0..6 | teto total: 0..24
    for (const k of Object.keys(byOrgan)) {
      byOrgan[k] = Math.min(Math.max(byOrgan[k], 0), 6);
    }
    total = Math.min(Math.max(total, 0), 24);

    // classificação base
    let levelKey = "fragilizada";
    let levelTitle = "Estrutura Fragilizada";
    if (total >= 18) {
      levelKey = "escala";
        levelTitle = "🟢 Estrutura Preparada para crescer";
    } else if (total >= 12) {
      levelKey = "consolidacao";
      levelTitle = "Estrutura em Consolidação";
    }

    // regra de segurança: se qualquer órgão <= 2, reduz 1 nível
    const hasCriticalOrgan = Object.values(byOrgan).some((v) => Number(v) <= 2);
    if (hasCriticalOrgan) {
      if (levelKey === "escala") {
        levelKey = "consolidacao";
        levelTitle = "Estrutura em Consolidação";
      } else if (levelKey === "consolidacao") {
        levelKey = "fragilizada";
        levelTitle = "Estrutura Fragilizada";
      }
    }

    return { total, byOrgan, levelKey, levelTitle };
  }

  function renderQuestionStep() {
    const q = window.GPSQuestions.getQuestionByStep(state.step);
    if (!q) {
      renderLayout({
        title: "Passo inválido",
        bodyHtml: `<p class="lead">Não foi possível carregar este passo. Volte e tente novamente.</p>`,
        showBack: true,
      });
      return;
    }

    const qidKey = String(q.id);
    const hasAnswer = Object.prototype.hasOwnProperty.call(state.answers || {}, qidKey);
    const selectedPoints = hasAnswer ? Number(state.answers[qidKey]) : null;

    const questionNumber = Math.max(1, Number(state.step) - 1);
    const totalQuestions = window.GPSQuestions.getQuestionCount ? window.GPSQuestions.getQuestionCount() : 12;

    const organUI = getOrganUIFromQuestion(q, questionNumber);
    // Usa classe específica do órgão (ex: organ-badge--cerebro)
    const modifierClass = organUI && organUI.badgeClass ? ` ${organUI.badgeClass}` : "";
    
    const organBadgeHtml = `
      <div class="organ-badge${modifierClass}" aria-label="Órgão atual">
        <span class="organ-badge__icon" aria-hidden="true">${renderLucideOrPulmaoIcon(organUI.icon)}</span>
        <span class="organ-badge__text">
          <span class="organ-badge__title">${escapeHtml(organUI.label)}</span>
          <span class="organ-badge__subtitle">${escapeHtml(organUI.subtitle)}</span>
        </span>
      </div>
    `.trim();

    const optionsHtml = q.options
      .map((opt) => {
        const value = Number(opt.points);
        const isSelected = selectedPoints !== null && value === selectedPoints;
        const pressed = isSelected ? "true" : "false";
        const cls = isSelected ? "option option--selected" : "option";
        return `
          <button
            type="button"
            class="${cls}"
            data-qid="${q.id}"
            data-value="${value}"
            aria-pressed="${pressed}"
          >
            <span class="option__label">${escapeHtml(opt.text)}</span>
          </button>
        `.trim();
      })
      .join("");

    const bodyHtml = `
      ${organBadgeHtml}
      <p class="lead">${escapeHtml(q.text || "")}</p>
      <div class="options" role="group" aria-label="Alternativas">
        ${optionsHtml}
      </div>
    `.trim();

    renderLayout({
      title: `Pergunta ${questionNumber} de ${totalQuestions}`,
      bodyHtml,
      showBack: true,
    });

    const optionButtons = Array.from(document.querySelectorAll(".option[data-qid][data-value]"));
    optionButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        // Evita duplo clique durante a animação/espera
        if (btn.disabled) return;

        const qid = String(btn.getAttribute("data-qid") || "");
        const value = Number(btn.getAttribute("data-value") || 0);
        if (!qid || !Number.isFinite(value) || value < 0) return;

        state.answers[qid] = Math.floor(value);

        // Persiste a resposta imediatamente (antes do avanço)
        persist();

        // Feedback visual: marca seleção e mostra check antes de avançar
        const backBtn = document.getElementById("backBtn");
        if (backBtn) backBtn.disabled = true;

        optionButtons.forEach((b) => {
          b.disabled = true;
          b.classList.remove("option--selected");
          b.setAttribute("aria-pressed", "false");
          const icon = b.querySelector(".option__icon");
          if (icon) icon.innerHTML = '<i data-lucide="circle"></i>';
        });

        btn.disabled = true;
        btn.classList.add("option--selected");
        btn.setAttribute("aria-pressed", "true");
        const selectedIcon = btn.querySelector(".option__icon");
        if (selectedIcon) selectedIcon.innerHTML = '<i data-lucide="check-circle"></i>';
        if (window.lucide && typeof window.lucide.createIcons === "function") {
          window.lucide.createIcons();
        }

        // Avança automaticamente após um pequeno delay para o usuário ver o check
        const ADVANCE_DELAY_MS = 500;
        window.setTimeout(function () {
          const total = getTotalSteps();

          if (state.step < total) {
            state.step = state.step + 1;
            persist();
            window.GPSUI.setStep(state.step, total);
            render();
            return;
          }

          // Último passo: marca como concluído e mantém em N/N
          state.completed = true;
          persist();
          window.GPSUI.setStep(state.step, total);
          render();
        }, ADVANCE_DELAY_MS);
      });
    });
  }

  function firstUnansweredStep() {
    const questions = window.GPSQuestions && Array.isArray(window.GPSQuestions.QUESTIONS) ? window.GPSQuestions.QUESTIONS : [];
    const answers = state.answers || {};
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      const key = String(q.id);
      if (!Object.prototype.hasOwnProperty.call(answers, key)) {
        // step 2 => pergunta 1
        return i + 2;
      }
    }
    return null;
  }

  function renderCompletion() {
    const totalQuestions = window.GPSQuestions.getQuestionCount();
    const answeredCount = Object.keys(state.answers || {}).length;

    // Segurança: não permite resultado sem responder tudo
    if (answeredCount < totalQuestions) {
      const target = firstUnansweredStep();
      state.completed = false;
      state.step = target ? normalizeStep(target) : 2;
      persist();
      window.GPSUI.setStep(state.step, getTotalSteps());
      render();
      return;
    }

    const score = calculateScore(state.answers);
    const maxScore = 24;

    // Dados estruturados para o relatório premium
    const LEVEL_DATA = {
      fragilizada: {
        colorClass: "indicator-fragilizada",
        title: "Estrutura Fragilizada",
        diagnosis: "Seu diagnóstico indica fragilidades que afetam margem, lucro e previsibilidade da operação. Sem organização e controle claros, resultados podem ser consumidos mesmo com faturamento relevante.",
        priorities: [
          "Reorganizar a base de gestão e fortalecer lideranças",
          "Recuperar controle financeiro e operacional",
          "Alinhar a equipe para sustentar operação e proteger lucro"
        ],
        institutional:
          "O próximo passo é avançar para sua Sessão Estratégica K2 com as fundadoras do método (60 minutos online, sem custo).\n\nEm 60 minutos, você terá direcionamento claro sobre o que precisa ajustar para fortalecer sua estrutura e ampliar lucro.\n\nVagas limitadas semanalmente para garantir direcionamento individual.",
        finalPhase: "Agora é hora de transformar diagnóstico em decisão."
      },
      consolidacao: {
        colorClass: "indicator-consolidacao",
        title: "Estrutura em Consolidação",
        diagnosis: "Sua rede apresenta organização básica e liderança ativa, mas ainda existem pontos importantes a fortalecer para reduzir riscos e garantir estabilidade.",
        priorities: [
          "Aprimorar processos internos",
          "Fortalecer lideranças intermediárias",
          "Consolidar padrões culturais e operacionais",
          "Proteger margem e lucro de variações operacionais"
        ],
        institutional:
          "O próximo passo é avançar para sua Sessão Estratégica K2 com as fundadoras do método (60 minutos online, sem custo).\n\nEm 60 minutos, você terá direcionamento claro sobre o que precisa ajustar para fortalecer sua estrutura e ampliar lucro.\n\nVagas limitadas semanalmente para garantir direcionamento individual.",
        finalPhase: "Agora é hora de transformar diagnóstico em decisão."
      },
      escala: {
        colorClass: "indicator-escala",
         title: "🟢 Estrutura Preparada para crescer",
        diagnosis: "Sua rede já possui operação organizada, liderança ativa, equipe engajada e alinhamento entre operação, margem e lucro. O foco agora é elevar performance e explorar oportunidades para resultados ainda mais consistentes.",
        priorities: [
          "Desenvolver lideranças e gestão de indicadores",
          "Otimizar processos e eficiência operacional",
          "Ampliar margem e lucro mantendo crescimento sustentável"
        ],
        institutional:
          "O próximo passo é avançar para sua Sessão Estratégica K2 com as fundadoras do método (60 minutos online, sem custo).\n\nEm 60 minutos, você terá direcionamento claro sobre o que precisa ajustar para fortalecer sua estrutura e ampliar lucro.\n\nVagas limitadas semanalmente para garantir direcionamento individual.",
        finalPhase: "Agora é hora de transformar diagnóstico em decisão."
      }
    };

    const currentLevel = LEVEL_DATA[score.levelKey] || LEVEL_DATA.fragilizada;

    function buildAnswersDetailed() {
      const questions = window.GPSQuestions && Array.isArray(window.GPSQuestions.QUESTIONS) ? window.GPSQuestions.QUESTIONS : [];
      const answerMap = state.answers && typeof state.answers === "object" ? state.answers : {};

      return questions
        .map((q, index) => {
          const qid = String(q.id);
          const points = Number(answerMap[qid]);
          const safePoints = Number.isFinite(points) ? Math.min(Math.max(Math.floor(points), 0), 2) : null;
          const selectedOption = Array.isArray(q.options)
            ? q.options.find((o) => Number(o.points) === safePoints)
            : null;

          const organUI = getOrganUIFromQuestion(q, index + 1);

          return {
            id: q.id,
            organKey: q.organ || "",
            organLabel: organUI && organUI.label ? organUI.label : "",
            question: q.text || "",
            selectedText: selectedOption && selectedOption.text ? selectedOption.text : "",
            points: safePoints,
          };
        })
        .filter((x) => x && x.id);
    }

    const organReading = [ORGAN_UI.cerebro, ORGAN_UI.coracao, ORGAN_UI.pulmao, ORGAN_UI.sangue]
      .map((o) => {
        const value = score.byOrgan && Object.prototype.hasOwnProperty.call(score.byOrgan, o.key) ? score.byOrgan[o.key] : 0;
        return `
          <div class="organ-reading-card">
            <div class="organ-reading-card__head">
              <span class="organ-reading-card__icon" aria-hidden="true">${renderLucideOrPulmaoIcon(o.icon)}</span>
              <span class="organ-reading-card__name">${escapeHtml(o.label)}</span>
            </div>
            <div class="organ-reading-card__desc">${escapeHtml(o.subtitle)}</div>
            <div class="organ-reading-card__score">${Number(value)}<span class="organ-reading-card__limit">/ 6</span></div>
          </div>
        `.trim();
      })
      .join("");

    // Salva payload final no localStorage
    const createdAt = new Date().toISOString();
    window.GPSStorage.save({
      ...window.GPSStorage.load(),
      quizName: QUIZ_NAME,
      lead: state.lead,
      answers: state.answers,
      score: { total: score.total, byOrgan: score.byOrgan },
      levelKey: score.levelKey,
      levelTitle: currentLevel.title,
      createdAt,
      completed: true,
      step: state.step,
    });

    // Gera lista de prioridades HTML
    const prioritiesHtml = currentLevel.priorities.map(p => `<li>${escapeHtml(p)}</li>`).join("");

    const bodyHtml = `
      <div class="report-view" role="region" aria-label="Relatório de Resultado">
        
        <div class="report-header">
          <h2 class="panel__title">Avaliação Estratégica de Sua Empresa</h2>
          <p class="report-subtitle">Resultado do seu diagnóstico</p>
        </div>

        <div class="result-indicator">
          <div class="indicator-square ${currentLevel.colorClass}"></div>
          <h3 class="result-title">${escapeHtml(currentLevel.title)}</h3>
        </div>

        <div class="result-content">
          <div class="content-block">
            <h4 class="content-block__title">Diagnóstico</h4>
            <p>${escapeHtml(currentLevel.diagnosis)}</p>
          </div>

          <div class="content-block content-block--priority">
            <h4 class="content-block__title">Prioridade Estratégica</h4>
            <ul class="priority-list">
              ${prioritiesHtml}
            </ul>
          </div>

          <div class="content-block content-block--scores">
            <div class="score-card">
              <span class="score-card__label">Pontuação Total</span>
              <div class="score-card__value">${score.total} <span class="score-card__total">/ ${maxScore}</span></div>
            </div>

            <div class="organ-reading" aria-label="Leitura por órgão">
              <div class="organ-reading__header">
                <h3 class="organ-reading__title">Leitura por órgão</h3>
              </div>
              <div class="organ-reading__grid">
                ${organReading}
              </div>
            </div>
          </div>

          <div class="content-block">
            <p class="institutional-msg">${escapeHtml(currentLevel.institutional)}</p>
          </div>

          <div class="final-highlight">
            <p>${escapeHtml(currentLevel.finalPhase)}</p>
          </div>
        </div>

        <div class="action-area">
          <button class="btn-premium-cta" type="button" id="sessionBtn">
            Quero solicitar minha Sessão Estratégica K2
          </button>
          
          <button class="btn-text-back" type="button" id="restartBtn">
            Refazer diagnóstico
          </button>
          
          <p class="form__hint" id="sessionHint" aria-live="polite"></p>
        </div>

      </div>
    `.trim();

    // Renderiza sem o botão "Voltar" padrão (showBack: false) pois criamos um customizado
    renderLayout({
      title: 'Concluído <span class="title-icon title-icon--seal" aria-hidden="true"><i data-lucide="check"></i></span>',
      bodyHtml,
      showBack: false, 
    });

    const btn = document.getElementById("sessionBtn");
    const restartBtn = document.getElementById("restartBtn");
    const hint = document.getElementById("sessionHint");
    
    if (restartBtn) {
      restartBtn.addEventListener("click", function () {
        try {
          window.GPSStorage.clear();
        } catch {
          // noop
        }
        state.step = 1;
        state.answers = {};
        state.lead = { nome: "", empresa: "", whatsapp: "" };
        state.completed = false;
        persist();
        window.GPSUI.setStep(state.step, getTotalSteps());
        render();
      });
    }

    if (btn) {
      btn.addEventListener("click", async function () {
        // Evita duplo clique
        btn.disabled = true;
      const oldText = btn.textContent;
      btn.textContent = "Direcionando...";
      if (hint) hint.textContent = "";

      const submittedAt = new Date().toISOString();
      const payload = {
        quizName: QUIZ_NAME,
        lead: state.lead,
        answers: state.answers,
        answersDetailed: buildAnswersDetailed(),
        score: { total: score.total, byOrgan: score.byOrgan },
        maxScore,
        levelKey: score.levelKey,
        levelTitle: score.levelTitle,
        diagnosis: currentLevel.diagnosis,
        priorities: currentLevel.priorities,
        institutional: currentLevel.institutional,
        finalPhase: currentLevel.finalPhase,
        createdAt,
        submittedAt,
      };

      // Importante: abrir o WhatsApp imediatamente (antes de await) para não ser bloqueado.
      const url = typeof globalThis.CTA_URL === "string" ? globalThis.CTA_URL.trim() : "";
      const fallbackWhatsappUrl =
        "https://wa.me/5513988241825?text=" +
        encodeURIComponent(
          "Olá! Concluí o Check-up K2 – Estrutura & Lucro e quero agendar minha Sessão Estratégica."
        );
      const targetUrl = url || fallbackWhatsappUrl;

      // Dispara integrações em background (não bloqueia o redirecionamento)
      try {
        if (window.GPSGAS && typeof window.GPSGAS.sendResultToAppsScript === "function") {
          window.GPSGAS.sendResultToAppsScript(payload);
        }
      } catch {
        // noop
      }

      // Redireciona SEMPRE na mesma aba (mais confiável que popup)
      window.location.href = targetUrl;
      return;

      try {
        let firebaseResult = null;
        let emailResult = null;
        let gasResult = null;

        // Firebase
        if (typeof window.saveLeadAndAnswers === "function") {
          firebaseResult = await window.saveLeadAndAnswers(payload);
        } else if (window.GPSFirebase && typeof window.GPSFirebase.saveLeadAndAnswers === "function") {
          firebaseResult = await window.GPSFirebase.saveLeadAndAnswers(payload);
        } else {
          console.log("[GPSFirebase] Não configurado/carregado. Payload:", payload);
        }

        // EmailJS
        if (typeof window.sendResultEmail === "function") {
          emailResult = await window.sendResultEmail(payload);
        } else if (window.GPSEmail && typeof window.GPSEmail.sendResultEmail === "function") {
          emailResult = await window.GPSEmail.sendResultEmail(payload);
        } else {
          console.log("[GPSEmail] Não configurado/carregado. Payload:", payload);
        }

        // Google Apps Script (Webhook)
        if (window.GPSGAS && typeof window.GPSGAS.sendResultToAppsScript === "function") {
          gasResult = await window.GPSGAS.sendResultToAppsScript(payload);
        } else {
          console.log("[GPSGAS] Não configurado/carregado. Payload:", payload);
        }

        const skippedFirebase = firebaseResult && firebaseResult.skipped === true;
        const skippedEmail = emailResult && emailResult.skipped === true;
        const skippedGas = gasResult && gasResult.skipped === true;
        const didSomething =
          (firebaseResult && firebaseResult.ok === true) ||
          (emailResult && emailResult.ok === true) ||
          (gasResult && gasResult.ok === true);

        // Direcionamento já foi feito no início do clique.

        // Feedback mínimo só quando algo foi realmente enviado
        if (hint && didSomething) hint.textContent = "Solicitação registrada.";
      } catch (err) {
        console.warn("[GPS] Falha ao processar integrações:", err);
        if (hint) hint.textContent = "Não foi possível enviar agora. Tente novamente.";
      } finally {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    });
    }
  }

  function render() {
    const total = getTotalSteps();
    window.GPSUI.setStep(state.step, total);

    if (state.step === 0) {
      renderWelcomeStep();
      return;
    }

    if (state.step === 1) {
      renderLeadStep();
      return;
    }

    if (state.step === total && state.completed) {
      renderCompletion();
      return;
    }

    renderQuestionStep();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttr(value) {
    // Para atributos/value de input
    return escapeHtml(value).replaceAll("`", "&#96;");
  }

  function init() {
    if (!window.GPSUI || !window.GPSStorage || !window.GPSQuestions) return;

    loadState();

    // Mantém o indicador visual consistente
    window.GPSUI.setStep(state.step, getTotalSteps());

    persist();
    render();
  }

  // computeScore/pickResult foram substituídos por calculateScore() conforme regra oficial

  window.GPSApp = {
    init,
    setStep,
    goBack,
    getState: function () {
      return JSON.parse(
        JSON.stringify({
          step: state.step,
          answers: state.answers,
          lead: state.lead,
          completed: state.completed,
        })
      );
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    init();
  });
})();
