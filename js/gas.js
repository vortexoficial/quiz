/* Integração Google Apps Script (Webhook) - opcional
 *
 * Requisito: o sistema deve funcionar sem configurar o webhook.
 *
 * Como configurar (exemplo):
 * window.GPSGASConfig = {
 *   webhookUrl: "https://script.google.com/macros/s/....../exec",
 *   token: "..."
 * };
 */

(function () {
  "use strict";

  function getConfig() {
    const cfg = window.GPSGASConfig;
    if (!cfg || typeof cfg !== "object") return null;

    const webhookUrl = typeof cfg.webhookUrl === "string" ? cfg.webhookUrl.trim() : "";
    const token = typeof cfg.token === "string" ? cfg.token.trim() : "";

    if (!webhookUrl || !token) return null;
    return { webhookUrl, token };
  }

  function sendResultToAppsScript(data) {
    const cfg = getConfig();

    if (!cfg) {
      console.log("[GPSGAS] Não configurado. Dados:", data);
      return Promise.resolve({ ok: false, skipped: true, reason: "not_configured" });
    }

    const ctaUrl = typeof globalThis.CTA_URL === "string" ? globalThis.CTA_URL.trim() : "";

    const payload = {
      ...data,
      token: cfg.token,
      ctaUrl,
    };

    const body = JSON.stringify(payload);

    // Melhor opção para site estático (evita CORS): sendBeacon
    try {
      if (navigator && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
        const ok = navigator.sendBeacon(cfg.webhookUrl, blob);
        return Promise.resolve({ ok: Boolean(ok), mode: "beacon" });
      }
    } catch (err) {
      // fallback abaixo
      console.warn("[GPSGAS] sendBeacon falhou, tentando fetch:", err);
    }

    // Fallback: fetch no-cors (resposta é opaque; não dá pra ler status)
    return fetch(cfg.webhookUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body,
      keepalive: true,
    })
      .then(() => ({ ok: true, mode: "no-cors" }))
      .catch((err) => ({ ok: false, error: String(err && err.message ? err.message : err) }));
  }

  window.GPSGAS = {
    sendResultToAppsScript,
  };
})();
