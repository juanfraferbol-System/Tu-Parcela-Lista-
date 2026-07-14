"use strict";

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = button.dataset.page;
  });
});

document.querySelectorAll(".card").forEach((card, index) => {
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  const targets = ["../index.html#parcelas-anchor", "../plataforma/publicar-parcela/", "../CRM.html", "../sitemap.xml"];
  const open = () => { window.location.href = targets[index]; };
  card.addEventListener("click", open);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); }
  });
});
