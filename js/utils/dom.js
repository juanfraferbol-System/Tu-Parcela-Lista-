/* Utilidades DOM simples para siguientes etapas. */
(function(window){
  window.TPL = window.TPL || {};
  window.TPL.dom = {
    qs: (selector, root = document) => root.querySelector(selector),
    qsa: (selector, root = document) => Array.from(root.querySelectorAll(selector)),
    show: (el) => { if (el) el.hidden = false; },
    hide: (el) => { if (el) el.hidden = true; }
  };
})(window);
