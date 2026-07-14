/* =========================================================
   Tu Parcela Lista v2 - Limpieza visual asesor virtual
========================================================= */
(function (document) {
  'use strict';

  function cleanAgentButtons() {
    document
      .querySelectorAll('.agente-actions,.agent-actions,.virtual-agent-actions,.chatbot-actions,.agente-panel [class*="quick"],.agent-panel [class*="quick"],.virtual-agent [class*="quick"],.chatbot [class*="quick"]')
      .forEach((element) => element.remove());
  }

  document.addEventListener('DOMContentLoaded', () => {
    cleanAgentButtons();
    setTimeout(cleanAgentButtons, 900);
    setTimeout(cleanAgentButtons, 2200);
  });
})(document);
