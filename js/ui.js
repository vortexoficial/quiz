/* UI (apenas estrutura visual)
 * - Sem lógica de perguntas
 * - Pronto para renderizar múltiplos passos com animação leve
 */

(function () {
  "use strict";

  const state = {
    step: 1,
    totalSteps: 11,
  };

  const dom = {
    stepIndicator: null,
    stepContent: null,
    progressFill: null, // NEW
    year: null,
  };

  function clampStep(step, totalSteps) {
    const safeTotal = Number.isFinite(totalSteps) && totalSteps > 0 ? Math.floor(totalSteps) : 1;
    const safeStep = Number.isFinite(step) ? Math.floor(step) : 1;
    return {
      // Permite Step 0 para a tela de boas-vindas
      step: Math.min(Math.max(safeStep, 0), safeTotal),
      totalSteps: safeTotal,
    };
  }

  function setStep(step, totalSteps) {
    const next = clampStep(step, totalSteps);
    state.step = next.step;
    state.totalSteps = next.totalSteps;

    if (dom.stepIndicator) {
      dom.stepIndicator.textContent = `${state.step} de ${state.totalSteps}`;
    }

    if (dom.progressFill) {
      const percentage = Math.min((state.step / state.totalSteps) * 100, 100);
      dom.progressFill.style.width = `${percentage}%`;
    }
  }

  function animateContentOnce() {
    if (!dom.stepContent) return;

    dom.stepContent.classList.remove("step-anim");
    // Força reflow para reiniciar a animação
    void dom.stepContent.offsetWidth; // eslint-disable-line no-unused-expressions
    dom.stepContent.classList.add("step-anim");
  }

  function setContent(html) {
    if (!dom.stepContent) return;
    dom.stepContent.innerHTML = html;

    // Ícones customizados (quando não existir no Lucide)
    const customIcons = {
      pulmao:
        '<img class="pulmao-icon" src="./assets/pulmao.png" alt="" aria-hidden="true" />',
    };

    Object.keys(customIcons).forEach((name) => {
      const nodes = dom.stepContent.querySelectorAll(`i[data-lucide="${name}"]`);
      nodes.forEach((node) => {
        node.outerHTML = customIcons[name];
      });
    });

    // Recolore o PNG do pulmão para a mesma cor dourada do tema (usa alpha como máscara)
    // - Funciona quando o CSS mask não renderiza no Edge
    // - Se o canvas for bloqueado (ex.: file:// com origem opaca), mantém o PNG original
    const lungImgs = Array.from(dom.stepContent.querySelectorAll('img.pulmao-icon'));
    lungImgs.forEach((img) => {
      const parent = img.parentElement;
      const targetColor = parent ? window.getComputedStyle(parent).color : "";

      // Evita retrabalho
      if (img.getAttribute("data-tinted") === "1") return;

      const sourceUrl = img.getAttribute("src") || "";
      if (!sourceUrl) return;

      const source = new Image();
      source.decoding = "async";
      source.loading = "eager";
      source.src = sourceUrl;

      source.onload = function () {
        try {
          const width = Math.max(source.naturalWidth || 0, 1);
          const height = Math.max(source.naturalHeight || 0, 1);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // 1) Preenche com a cor do wrapper
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = targetColor || "#C6A96B";
          ctx.fillRect(0, 0, width, height);

          // 2) Mantém só onde o PNG tem alpha
          ctx.globalCompositeOperation = "destination-in";
          ctx.drawImage(source, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/png");
          img.src = dataUrl;
          img.setAttribute("data-tinted", "1");
        } catch {
          // Fallback: deixa o PNG original
        }
      };
    });

    // --- VISUAL ENHANCEMENTS (UI ONLY) ---
    // Injeta ícones Lucide nas opções de resposta
    const options = dom.stepContent.querySelectorAll('.option');
    options.forEach(opt => {
      const isSelected = opt.classList.contains('option--selected');
      const iconName = isSelected ? 'check-circle' : 'circle';
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'option__icon';
      iconWrapper.innerHTML = `<i data-lucide="${iconName}"></i>`;
      opt.prepend(iconWrapper);
    });

    // Injeta ícone Lucide no botão voltar
    const backBtn = dom.stepContent.querySelector('.nav__back');
    if (backBtn) {
      // Limpa texto antigo ("< Voltar") e recria estrutura
      backBtn.innerHTML = `<i data-lucide="arrow-left"></i> Voltar`;
    }

    // Inicializa ícones Lucide
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    // -------------------------------------

    animateContentOnce();

    // Acessibilidade: foca a região ao trocar de passo
    try {
      dom.stepContent.setAttribute("tabindex", "-1");
      dom.stepContent.focus({ preventScroll: true });
    } catch {
      // noop
    }

    // Garante topo visível em mobile
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  function renderPlaceholder() {
    setContent(
      `
      <h1 class="h1">Check-up K2 – Estrutura & Lucro</h1>
      <p class="lead">Carregando diagnóstico...</p>

      <div class="panel" role="note" aria-label="Estrutura pronta">
        <h2 class="panel__title">Estrutura preparada</h2>
        <p class="panel__text">Esta tela já contém o container, header com a logo, indicador de passo e uma área de conteúdo dinâmica com animação suave para troca de etapas.</p>
        <div class="divider" role="presentation"></div>
        <p class="panel__text">Próximo passo: integrar a lógica de perguntas em arquivos separados (questions, scoring, storage etc.).</p>

        <div class="badge-row" aria-label="Componentes prontos">
          <span class="badge"><span class="badge__dot" aria-hidden="true"></span>Card responsivo</span>
          <span class="badge"><span class="badge__dot" aria-hidden="true"></span>Header com logo</span>
          <span class="badge"><span class="badge__dot" aria-hidden="true"></span>Passo dinâmico</span>
          <span class="badge"><span class="badge__dot" aria-hidden="true"></span>Área de conteúdo</span>
          <span class="badge"><span class="badge__dot" aria-hidden="true"></span>Transição suave</span>
        </div>
      </div>
      `.trim()
    );
  }

  function init() {
    dom.stepIndicator = document.getElementById("stepIndicator");
    dom.stepContent = document.getElementById("stepContent");
    dom.progressFill = document.querySelector(".progress-bar > .progress-fill");
    
    // Fallback: se não achar, cria
    if (!dom.progressFill) {
      const pBar = document.querySelector(".progress-bar");
      if (pBar) {
        dom.progressFill = document.createElement("div");
        dom.progressFill.className = "progress-fill";
        dom.progressFill.id = "progressFill";
        pBar.appendChild(dom.progressFill);
      }
    }
    
    dom.year = document.getElementById("year");

    if (dom.year) {
      dom.year.textContent = String(new Date().getFullYear());
    }

    setStep(state.step, state.totalSteps);
    renderPlaceholder();
  }

  // API pública (para integração futura com app.js)
  window.GPSUI = {
    init,
    setStep,
    setContent,
  };

  document.addEventListener("DOMContentLoaded", function () {
    init();
  });
})();
