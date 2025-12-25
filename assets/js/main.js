// assets/js/main.js

document.addEventListener("DOMContentLoaded", () => {
  setupMobileNav();
  highlightActiveNavLink();
  setupDemoForms();
  setupEventFilters();
});

/**
 * Mobile burger menu toggle
 */
function setupMobileNav() {
  const toggle = document.querySelector(".nav__toggle");
  const menu = document.querySelector(".nav__menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    menu.classList.toggle("nav__menu--open");
  });
}

/**
 * Highlight active nav link based on file name
 */
function highlightActiveNavLink() {
  const links = document.querySelectorAll(".nav__link");
  if (!links.length) return;

  const path = window.location.pathname;
  const current = path.substring(path.lastIndexOf("/") + 1) || "index.html";

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    const hrefFile = href.substring(href.lastIndexOf("/") + 1);
    if (hrefFile === current) {
      link.classList.add("nav__link--active");
    }
  });
}

/**
 * Simple demo handles for forms (prevent submit)
 */
function setupDemoForms() {
  const forms = document.querySelectorAll("form[data-demo-form]");
  forms.forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      alert(form.dataset.demoMessage || "Формуларот е испратен (демо).");
    });
  });
}

/**
 * Simple filtering for events if filter buttons exist
 */
function setupEventFilters() {
  const filterContainer = document.querySelector("[data-event-filters]");
  if (!filterContainer) return;

  const buttons = filterContainer.querySelectorAll("button[data-filter]");
  const cards = document.querySelectorAll("[data-event-type]");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.filter;

      buttons.forEach((b) => b.classList.remove("btn--primary"));
      buttons.forEach((b) => b.classList.add("btn--outline"));

      btn.classList.remove("btn--outline");
      btn.classList.add("btn--primary");

      cards.forEach((card) => {
        const cardType = card.dataset.eventType;
        if (type === "all" || cardType === type) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}
