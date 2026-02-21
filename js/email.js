/* Integração EmailJS (CDN) - opcional
 *
 * Requisito: o sistema deve funcionar sem configurar EmailJS.
 * - Se não configurado, apenas console.log.
 *
 * Como configurar (exemplo):
 * window.GPSEmailJSConfig = {
 *   publicKey: "...",
 *   serviceId: "...",
 *   templateId: "..."
 * };
 */

(function () {
  "use strict";

  const CDN = {
    emailjs: "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js",
  };

  let loadingPromise = null;
  let initialized = false;

  function getConfig() {
    const cfg = window.GPSEmailJSConfig;
    if (!cfg || typeof cfg !== "object") return null;

    const publicKey = typeof cfg.publicKey === "string" ? cfg.publicKey.trim() : "";
    const serviceId = typeof cfg.serviceId === "string" ? cfg.serviceId.trim() : "";
    const templateId = typeof cfg.templateId === "string" ? cfg.templateId.trim() : "";

    if (!publicKey || !serviceId || !templateId) return null;

    return { publicKey, serviceId, templateId };
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-gps-src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)));
        if (existing.getAttribute("data-gps-loaded") === "true") resolve();
        return;
      }

      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.defer = true;
      s.setAttribute("data-gps-src", src);
      s.addEventListener("load", () => {
        s.setAttribute("data-gps-loaded", "true");
        resolve();
      });
      s.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)));
      document.head.appendChild(s);
    });
  }

  async function ensureEmailJSLoaded() {
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      await loadScript(CDN.emailjs);

      // UMD expõe window.emailjs
      if (!window.emailjs) {
        throw new Error("EmailJS CDN carregou, mas `window.emailjs` não está disponível.");
      }

      return true;
    })();

    return loadingPromise;
  }

  function ensureInitialized() {
    if (initialized) return true;
    const cfg = getConfig();
    if (!cfg) return false;
    if (!window.emailjs) return false;

    try {
      window.emailjs.init({ publicKey: cfg.publicKey });
      initialized = true;
      return true;
    } catch (err) {
      console.warn("[GPSEmail] Não foi possível inicializar EmailJS:", err);
      return false;
    }
  }

  async function sendResultEmail(data) {
    const cfg = getConfig();

    if (!cfg) {
      console.log("[GPSEmail] Não configurado. Dados para e-mail:", data);
      return { ok: false, skipped: true, reason: "not_configured" };
    }

    try {
      await ensureEmailJSLoaded();

      const okInit = ensureInitialized();
      if (!okInit) {
        console.log("[GPSEmail] Config informado, mas inicialização não concluiu. Dados:", data);
        return { ok: false, skipped: true, reason: "init_failed" };
      }

      // Mantenha payload simples: templates podem mapear campos.
      const payload = {
        name: data?.lead?.name || "",
        email: data?.lead?.email || "",
        whatsapp: data?.lead?.whatsapp || "",
        cidade: data?.lead?.cidade || "",
        nivel: data?.resultLevel || "",
        pontuacao_total: String(data?.scoreTotal ?? ""),
        max: String(data?.scoreMax ?? ""),
        // JSON bruto (se quiser usar no template)
        raw: JSON.stringify(data),
      };

      const resp = await window.emailjs.send(cfg.serviceId, cfg.templateId, payload);
      return { ok: true, response: resp };
    } catch (err) {
      console.warn("[GPSEmail] Falha ao enviar e-mail:", err);
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  window.GPSEmail = {
    sendResultEmail,
  };

  // API global exigida pelo enunciado
  window.sendResultEmail = sendResultEmail;
})();
