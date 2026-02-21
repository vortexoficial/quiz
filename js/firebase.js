/* Integração Firebase (CDN) - opcional
 *
 * Requisito: o sistema deve funcionar sem configurar Firebase.
 * - Se não configurado, apenas console.log.
 *
 * Como configurar (exemplo):
 * window.GPSFirebaseConfig = {
 *   firebaseConfig: { ... },
 *   firestoreCollection: "gps_diagnostico_leads" // opcional
 * };
 */

(function () {
  "use strict";

  const CDN = {
    app: "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js",
    firestore: "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js",
  };

  let loadingPromise = null;
  let initialized = false;

  function getConfig() {
    const cfg = window.GPSFirebaseConfig;
    if (!cfg || typeof cfg !== "object") return null;
    if (!cfg.firebaseConfig || typeof cfg.firebaseConfig !== "object") return null;
    return {
      firebaseConfig: cfg.firebaseConfig,
      firestoreCollection: typeof cfg.firestoreCollection === "string" && cfg.firestoreCollection.trim()
        ? cfg.firestoreCollection.trim()
        : "gps_diagnostico_leads",
    };
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-gps-src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error(`Falha ao carregar ${src}`)));
        // Se já foi carregado, resolve imediatamente
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

  async function ensureFirebaseLoaded() {
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      await loadScript(CDN.app);
      await loadScript(CDN.firestore);

      if (!window.firebase) {
        throw new Error("Firebase CDN carregou, mas `window.firebase` não está disponível.");
      }

      return true;
    })();

    return loadingPromise;
  }

  function ensureInitialized() {
    if (initialized) return true;

    const cfg = getConfig();
    if (!cfg) return false;

    if (!window.firebase) return false;

    try {
      if (!window.firebase.apps || window.firebase.apps.length === 0) {
        window.firebase.initializeApp(cfg.firebaseConfig);
      }
      initialized = true;
      return true;
    } catch (err) {
      console.warn("[GPSFirebase] Não foi possível inicializar Firebase:", err);
      return false;
    }
  }

  async function saveLeadAndAnswers(data) {
    const cfg = getConfig();

    if (!cfg) {
      console.log("[GPSFirebase] Não configurado. Dados a salvar:", data);
      return { ok: false, skipped: true, reason: "not_configured" };
    }

    try {
      await ensureFirebaseLoaded();

      const okInit = ensureInitialized();
      if (!okInit) {
        console.log("[GPSFirebase] Config informado, mas inicialização não concluiu. Dados:", data);
        return { ok: false, skipped: true, reason: "init_failed" };
      }

      const db = window.firebase.firestore();
      const payload = {
        ...data,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection(cfg.firestoreCollection).add(payload);
      return { ok: true };
    } catch (err) {
      console.warn("[GPSFirebase] Falha ao salvar no Firebase:", err);
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  window.GPSFirebase = {
    saveLeadAndAnswers,
  };

  // API global exigida pelo enunciado
  window.saveLeadAndAnswers = saveLeadAndAnswers;
})();
