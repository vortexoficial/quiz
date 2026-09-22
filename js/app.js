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

  const QUIZ_NAME = "CHECK-UP LOJA LUCRATIVA";

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
      subtitle: "Estratégia, Gestão e Crescimento",
      icon: "brain",
      className: "organ-chip--cerebro",
      badgeClass: "organ-badge--cerebro"
    },
    coracao: {
      key: "coracao",
      label: "Coração",
      subtitle: "Cultura, Liderança e Equipe",
      icon: "heart",
      className: "organ-chip--coracao",
      badgeClass: "organ-badge--coracao"
    },
    pulmao: {
      key: "pulmao",
      label: "Pulmão",
      subtitle: "Vendas, Margem e Lucro",
      icon: "pulmao",
      className: "organ-chip--pulmao",
      badgeClass: "organ-badge--pulmao"
    },
    sangue: {
      key: "sangue",
      label: "Sangue",
      subtitle: "Padronização e Experiência do Cliente",
      icon: "droplet",
      className: "organ-chip--sangue",
      badgeClass: "organ-badge--sangue"
    },
  };

  function renderLucideOrPulmaoIcon(iconName) {
    if (String(iconName || "") === "pulmao") {
      return '<img class="pulmao-icon" src="./assets/pulmao.png" alt="" aria-hidden="true" />';
    }
    if (String(iconName || "") === "heart") {
      return '<img class="coracao-icon" src="./assets/coracao.png" alt="" aria-hidden="true" />';
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
      const p = Math.min(Math.max(Math.floor(points), 1), 3);
      total += p;
      if (q.organ && Object.prototype.hasOwnProperty.call(byOrgan, q.organ)) {
        byOrgan[q.organ] += p;
      }
    }

    // teto por órgão: 3..9 | teto total: 12..36
    for (const k of Object.keys(byOrgan)) {
      byOrgan[k] = Math.min(Math.max(byOrgan[k], 3), 9);
    }
    total = Math.min(Math.max(total, 12), 36);

    // classificação base
    let levelKey = "fragilizada";
    let levelTitle = "Estrutura Fragilizada";
    if (total >= 30) {
      levelKey = "escala";
      levelTitle = "Estrutura Estratégica para Escala Sustentável";
    } else if (total >= 24) {
      levelKey = "consolidacao";
      levelTitle = "Estrutura em Consolidação";
    }

    // nível que a nota sozinha indicaria, antes da regra de segurança
    const levelBeforeRule = levelKey;
    const titleBeforeRule = levelTitle;

    // órgãos abaixo do nível intermediário (6 de 9)
    const criticalOrgans = Object.keys(byOrgan).filter((k) => Number(byOrgan[k]) <= 5);

    // regra de segurança: com qualquer órgão crítico, reduz 1 nível
    if (criticalOrgans.length) {
      if (levelKey === "escala") {
        levelKey = "consolidacao";
        levelTitle = "Estrutura em Consolidação";
      } else if (levelKey === "consolidacao") {
        levelKey = "fragilizada";
        levelTitle = "Estrutura Fragilizada";
      }
    }

    // só houve rebaixamento se o nível realmente mudou.
    // quem já estava em "fragilizada" continua igual: a regra não alterou nada.
    const demoted = levelKey !== levelBeforeRule;

    return { total, byOrgan, levelKey, levelTitle, criticalOrgans, demoted, levelBeforeRule, titleBeforeRule };
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
    const maxScore = 36;

    // Dados estruturados para o relatório premium
    const LEVEL_DATA = {
      fragilizada: {
        colorClass: "indicator-fragilizada",
        title: "Estrutura Fragilizada",
        diagnosis:
          "Seu diagnóstico indica que sua empresa ainda opera com alta dependência de pessoas, baixa previsibilidade e pouca estrutura de gestão.\n\nIsso significa que, mesmo com esforço constante, os resultados ainda estão mais ligados à execução diária do que a um sistema organizado de crescimento.\n\nNa prática, isso gera três impactos diretos:",
        impacts: [
          "Decisões inconsistentes e reativas",
          "Dependência excessiva do dono ou de pessoas-chave",
          "Dificuldade em proteger margem e lucro ao longo do tempo"
        ],
        priorityIntro:
          "O foco neste momento não é acelerar crescimento. É estruturar a base da sua empresa.\n\nIsso envolve:",
        priorities: [
          "Organizar a forma como as decisões são tomadas",
          "Fortalecer liderança e autonomia operacional",
          "Criar controle real sobre margem, vendas e operação"
        ],
        direction:
          "Empresas nesse estágio não têm problema de esforço. Têm problema de estrutura.\n\nE sem estrutura, o crescimento tende a amplificar os problemas existentes, não resolver.",
        nextStep:
          "Você poderá ser selecionado(a) para uma Sessão Estratégica K2 (online, 60 minutos) com as especialistas do método.\n\nNessa sessão, vamos analisar os principais pontos que estão limitando sua estrutura hoje e o que precisa ser reorganizado primeiro para sua empresa evoluir com segurança.",
        finalPhase: "Crescimento sem estrutura não sustenta resultado."
      },
      consolidacao: {
        colorClass: "indicator-consolidacao",
        title: "Estrutura em Consolidação",
        diagnosis:
          "Seu diagnóstico indica que sua empresa já possui organização básica e algum nível de gestão, mas ainda depende de ajustes importantes para ganhar previsibilidade e consistência.\n\nNa prática, isso significa que a empresa já funciona, mas ainda oscila em:",
        impacts: [
          "Resultados",
          "Execução",
          "Controle de indicadores",
          "Alinhamento da equipe"
        ],
        priorityIntro:
          "O próximo nível de evolução não está em “fazer mais”. Está em fazer com consistência e controle.\n\nOs principais focos são:",
        priorities: [
          "Fortalecer processos e rotinas de gestão",
          "Desenvolver liderança intermediária",
          "Melhorar o uso de indicadores na tomada de decisão",
          "Proteger margem e lucro de variações operacionais"
        ],
        direction:
          "Sua empresa já saiu do estágio inicial, mas ainda não atingiu estabilidade suficiente para crescer sem oscilações.\n\nIsso significa que o crescimento pode acontecer — porém com risco de perda de eficiência e margem se a estrutura não evoluir junto.",
        nextStep:
          "Você poderá ser selecionado(a) para uma Sessão Estratégica K2 (online, 60 minutos).\n\nNessa sessão, vamos identificar quais ajustes estruturais vão trazer mais previsibilidade e consistência para sua operação.",
        finalPhase: "Crescimento sem consistência gera esforço sem resultado proporcional."
      },
      escala: {
        colorClass: "indicator-escala",
        title: "Estrutura Estratégica para Escala Sustentável",
        diagnosis:
          "Seu diagnóstico indica que sua empresa já possui um nível consistente de estrutura, com processos, liderança e gestão relativamente organizados.\n\nIsso significa que a operação já funciona de forma mais independente e com menor variação entre pessoas e momentos.",
        impacts: [],
        priorityIntro:
          "Neste estágio, o desafio não é estruturar o básico. É elevar performance e eficiência.\n\nOs principais focos são:",
        priorities: [
          "Otimização de margem e rentabilidade",
          "Evolução de indicadores de performance",
          "Desenvolvimento de liderança para escala",
          "Expansão com controle e previsibilidade"
        ],
        direction:
          "Empresas nesse nível já não crescem por tentativa e erro. Elas crescem por decisão estratégica.\n\nO próximo passo não é corrigir falhas básicas, mas sim aumentar eficiência, margem e capacidade de escala sustentável.",
        nextStep:
          "Você poderá ser selecionado(a) para uma Sessão Estratégica K2 (online, 60 minutos).\n\nNessa sessão, vamos aprofundar oportunidades de otimização e crescimento para elevar ainda mais o nível de performance da sua empresa.",
        finalPhase: "Crescimento sem otimização limita o potencial da empresa."
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
          const safePoints = Number.isFinite(points) ? Math.min(Math.max(Math.floor(points), 1), 3) : null;
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

    const criticalKeys = Array.isArray(score.criticalOrgans) ? score.criticalOrgans : [];

    const organReading = [ORGAN_UI.cerebro, ORGAN_UI.coracao, ORGAN_UI.pulmao, ORGAN_UI.sangue]
      .map((o) => {
        const value = score.byOrgan && Object.prototype.hasOwnProperty.call(score.byOrgan, o.key) ? score.byOrgan[o.key] : 0;
        const isCritical = criticalKeys.indexOf(o.key) !== -1;
        const cardClass = isCritical ? "organ-reading-card organ-reading-card--critical" : "organ-reading-card";
        const tag = isCritical ? `<span class="organ-reading-card__tag">Ponto crítico</span>` : "";
        return `
          <div class="${cardClass}">
            <div class="organ-reading-card__head">
              <span class="organ-reading-card__icon" aria-hidden="true">${renderLucideOrPulmaoIcon(o.icon)}</span>
              <span class="organ-reading-card__name">${escapeHtml(o.label)}</span>
            </div>
            <div class="organ-reading-card__desc">${escapeHtml(o.subtitle)}</div>
            <div class="organ-reading-card__score">${Number(value)}<span class="organ-reading-card__limit">/ 9</span></div>
            ${tag}
          </div>
        `.trim();
      })
      .join("");

    // Aviso da regra de segurança.
    // Só aparece quando a regra REALMENTE mudou o enquadramento. Quem já estava
    // em "Estrutura Fragilizada" não foi rebaixado, então não há o que explicar.
    const criticalNoticeHtml = (function () {
      if (!score.demoted || !criticalKeys.length) return "";

      const nomes = criticalKeys.map(function (k) {
        return ORGAN_UI[k] && ORGAN_UI[k].label ? ORGAN_UI[k].label : k;
      });

      const lista =
        nomes.length === 1
          ? `o <strong>${escapeHtml(nomes[0])}</strong>`
          : `os órgãos <strong>${escapeHtml(nomes.slice(0, -1).join(", "))}</strong> e <strong>${escapeHtml(nomes[nomes.length - 1])}</strong>`;

      const verbo = nomes.length === 1 ? "está" : "estão";

      // com um órgão só, o nome já foi dito na frase: mostra apenas a nota
      const detalhe =
        criticalKeys.length === 1
          ? `${Number(score.byOrgan[criticalKeys[0]])}/9`
          : criticalKeys
              .map(function (k) {
                const label = ORGAN_UI[k] && ORGAN_UI[k].label ? ORGAN_UI[k].label : k;
                return `${escapeHtml(label)} ${Number(score.byOrgan[k])}/9`;
              })
              .join(" · ");

      return `
        <div class="critical-notice" role="note">
          <div class="critical-notice__title">Por que a classificação foi ajustada</div>
          <p class="critical-notice__text">
            Sua pontuação total alcança o nível <strong>${escapeHtml(score.titleBeforeRule)}</strong>,
            mas ${lista} ${verbo} em nível crítico (${detalhe}).
            Como uma área comprometida limita o desempenho de todas as outras,
            o resultado foi enquadrado como <strong>${escapeHtml(score.levelTitle)}</strong>.
          </p>
        </div>
      `.trim();
    })();

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

    // Monta o payload completo enviado ao Apps Script (reutilizado no auto-envio e no CTA).
    function buildSubmitPayload() {
      return {
        quizName: QUIZ_NAME,
        lead: state.lead,
        answers: state.answers,
        answersDetailed: buildAnswersDetailed(),
        score: { total: score.total, byOrgan: score.byOrgan },
        maxScore,
        levelKey: score.levelKey,
        levelTitle: score.levelTitle,
        diagnosis: currentLevel.diagnosis,
        // impacts completa a frase do diagnóstico ("ainda oscila em:") e
        // priorityIntro abre a lista de prioridades. Os dois já apareciam na
        // tela final, mas não eram enviados, e o e-mail saía truncado.
        impacts: currentLevel.impacts,
        priorityIntro: currentLevel.priorityIntro,
        priorities: currentLevel.priorities,
        direction: currentLevel.direction,
        nextStep: currentLevel.nextStep,
        finalPhase: currentLevel.finalPhase,
        createdAt,
        submittedAt: new Date().toISOString(),
      };
    }

    // Listas e parágrafos do relatório
    const impactsHtml = Array.isArray(currentLevel.impacts)
      ? currentLevel.impacts.map((i) => `<li>${escapeHtml(i)}</li>`).join("")
      : "";
    const prioritiesHtml = currentLevel.priorities.map((p) => `<li>${escapeHtml(p)}</li>`).join("");

    const bodyHtml = `
      <div class="report-view" role="region" aria-label="Relatório de Resultado">

        <div class="report-header">
          <h2 class="panel__title">Avaliação Estratégica da Sua Empresa</h2>
          <p class="report-subtitle">Resultado do seu diagnóstico</p>
        </div>

        <div class="result-indicator">
          <div class="indicator-square ${currentLevel.colorClass}"></div>
          <h3 class="result-title">${escapeHtml(currentLevel.title)}</h3>
        </div>

        <div class="result-content">
          <div class="content-block">
            <h4 class="content-block__title">Diagnóstico</h4>
            ${paragraphsHtml(currentLevel.diagnosis)}
            ${impactsHtml ? `<ul class="priority-list">${impactsHtml}</ul>` : ""}
          </div>

          <div class="content-block content-block--priority">
            <h4 class="content-block__title">Prioridade Estratégica</h4>
            ${paragraphsHtml(currentLevel.priorityIntro)}
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

            ${criticalNoticeHtml}
          </div>

          <div class="content-block">
            <h4 class="content-block__title">Direcionamento</h4>
            ${paragraphsHtml(currentLevel.direction)}
          </div>

          <div class="content-block">
            <h4 class="content-block__title">Próximo Passo</h4>
            ${paragraphsHtml(currentLevel.nextStep)}
          </div>

          <div class="final-highlight">
            <p>${escapeHtml(currentLevel.finalPhase)}</p>
          </div>
        </div>

        <div class="action-area">
          <button class="btn-premium-cta" type="button" id="sessionBtn">
            Quero solicitar minha <span class="cta-break-mobile"><br /></span>Sessão Estratégica&nbsp;K2
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
      btn.addEventListener("click", function () {
        // Evita duplo clique
        btn.disabled = true;
        btn.textContent = "Direcionando...";
        if (hint) hint.textContent = "";

        // Garante a captura do lead (idempotente: já pode ter sido enviado ao concluir).
        try {
          submitResult(buildSubmitPayload());
        } catch {
          // noop
        }

        // Redireciona SEMPRE na mesma aba (mais confiável que popup).
        const url = typeof globalThis.CTA_URL === "string" ? globalThis.CTA_URL.trim() : "";
        const fallbackWhatsappUrl =
          "https://wa.me/5513978139761?text=" +
          encodeURIComponent(
            "Quero mais clareza e direção para meu negócio e saber como a K2 pode me ajudar."
          );
        window.location.href = url || fallbackWhatsappUrl;
      });
    }

    // Captura o lead assim que o diagnóstico é gerado — não depende do clique no CTA.
    try {
      submitResult(buildSubmitPayload());
    } catch {
      // noop
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

  // Converte texto com quebras de linha em parágrafos HTML escapados.
  function paragraphsHtml(value) {
    return String(value || "")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `<p>${escapeHtml(s)}</p>`)
      .join("");
  }

  let resultSent = false; // guarda de sessão contra envio duplicado do lead
  let flushInFlight = false; // evita reenvio concorrente do lead pendente
  let onlineListenerAttached = false; // garante um único listener de "online"

  function isOnline() {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }

  function saveSubmitFlags(extra) {
    try {
      const existing = window.GPSStorage.load();
      window.GPSStorage.save({ ...existing, ...extra });
    } catch {
      // noop
    }
  }

  // Envia o resultado/lead ao Apps Script de forma idempotente e resiliente:
  // - não reenvia se já houve envio (submittedAt) ou nesta sessão (resultSent);
  // - se estiver offline, guarda o payload e tenta de novo depois (init / evento "online").
  function submitResult(payload) {
    if (!payload || resultSent) return;

    let persisted = {};
    try {
      persisted = window.GPSStorage.load() || {};
    } catch {
      // noop
    }
    if (persisted.submittedAt) {
      resultSent = true;
      return;
    }

    if (!isOnline()) {
      saveSubmitFlags({ pendingSubmit: true, pendingPayload: JSON.stringify(payload) });
      return;
    }

    if (!(window.GPSGAS && typeof window.GPSGAS.sendResultToAppsScript === "function")) return;

    resultSent = true; // otimista: evita duplo envio no mesmo carregamento
    saveSubmitFlags({ pendingSubmit: true, pendingPayload: JSON.stringify(payload) });

    Promise.resolve()
      .then(function () {
        return window.GPSGAS.sendResultToAppsScript(payload);
      })
      .then(function (res) {
        if (res && res.skipped) {
          // Webhook não configurado: nada a enviar.
          saveSubmitFlags({ pendingSubmit: false, pendingPayload: "" });
          return;
        }
        saveSubmitFlags({ submittedAt: new Date().toISOString(), pendingSubmit: false, pendingPayload: "" });
      })
      .catch(function () {
        // Falhou: mantém pendente para nova tentativa futura.
        resultSent = false;
        saveSubmitFlags({ pendingSubmit: true, pendingPayload: JSON.stringify(payload) });
      });
  }

  // Reenvia um lead que ficou pendente (ex.: usuário concluiu offline e voltou online).
  function flushPendingSubmit() {
    if (flushInFlight || !isOnline()) return;

    let p = {};
    try {
      p = window.GPSStorage.load() || {};
    } catch {
      return;
    }
    if (!p.pendingSubmit || !p.pendingPayload || p.submittedAt) return;
    if (!(window.GPSGAS && typeof window.GPSGAS.sendResultToAppsScript === "function")) return;

    let payload;
    try {
      payload = JSON.parse(p.pendingPayload);
    } catch {
      saveSubmitFlags({ pendingSubmit: false, pendingPayload: "" });
      return;
    }

    flushInFlight = true;
    Promise.resolve()
      .then(function () {
        return window.GPSGAS.sendResultToAppsScript(payload);
      })
      .then(function (res) {
        if (res && res.skipped) {
          saveSubmitFlags({ pendingSubmit: false, pendingPayload: "" });
          return;
        }
        saveSubmitFlags({ submittedAt: new Date().toISOString(), pendingSubmit: false, pendingPayload: "" });
      })
      .catch(function () {
        // noop: tenta de novo no próximo carregamento / evento "online"
      })
      .then(function () {
        flushInFlight = false;
      });
  }

  function init() {
    if (!window.GPSUI || !window.GPSStorage || !window.GPSQuestions) return;

    loadState();

    // Mantém o indicador visual consistente
    window.GPSUI.setStep(state.step, getTotalSteps());

    persist();
    render();

    // Resiliência: reenvia lead pendente e escuta a volta da conexão.
    try {
      flushPendingSubmit();
    } catch {
      // noop
    }
    try {
      if (!onlineListenerAttached) {
        onlineListenerAttached = true;
        window.addEventListener("online", function () {
          try {
            flushPendingSubmit();
          } catch {
            // noop
          }
        });
      }
    } catch {
      // noop
    }
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
