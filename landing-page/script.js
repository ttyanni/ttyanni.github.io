const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getFocusTarget(section) {
  return section.matches("[data-focus-heading]")
    ? section
    : section.querySelector("[data-focus-heading]") || section;
}

function moveToSection(selector) {
  const section = document.querySelector(selector);
  if (!section) return;

  section.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start"
  });

  const focusTarget = getFocusTarget(section);
  window.setTimeout(() => focusTarget.focus({ preventScroll: true }), prefersReducedMotion ? 0 : 520);
}

window.addEventListener("load", () => {
  if (window.location.hash && document.querySelector(window.location.hash)) {
    moveToSection(window.location.hash);
  }
});

document.querySelectorAll("[data-scroll-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const selector = link.getAttribute("href");
    if (!selector || !selector.startsWith("#")) return;
    event.preventDefault();
    moveToSection(selector);
  });
});

document.querySelectorAll("[data-scroll-target]").forEach((button) => {
  button.addEventListener("click", () => moveToSection(button.dataset.scrollTarget));
});

const accordion = document.querySelector("[data-accordion]");

if (accordion) {
  const faqItems = [...accordion.querySelectorAll(".faq-item")];

  faqItems.forEach((item) => {
    const button = item.querySelector("button[aria-controls]");
    const answer = document.getElementById(button.getAttribute("aria-controls"));
    const symbol = button.querySelector(".faq-symbol");

    button.addEventListener("click", () => {
      const willOpen = button.getAttribute("aria-expanded") !== "true";

      faqItems.forEach((otherItem) => {
        const otherButton = otherItem.querySelector("button[aria-controls]");
        const otherAnswer = document.getElementById(otherButton.getAttribute("aria-controls"));
        const otherSymbol = otherButton.querySelector(".faq-symbol");
        otherItem.classList.remove("is-open");
        otherButton.setAttribute("aria-expanded", "false");
        otherAnswer.setAttribute("inert", "");
        otherSymbol.textContent = "+";
      });

      if (willOpen) {
        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
        answer.removeAttribute("inert");
        symbol.textContent = "−";
      }
    });
  });
}

const dialog = document.getElementById("image-lightbox");
const dialogMedia = document.getElementById("lightbox-media");
const dialogCaption = document.getElementById("lightbox-caption");
const dialogClose = dialog?.querySelector(".dialog-close");
let lastDialogTrigger = null;

function closeDialog() {
  if (!dialog?.open) return;
  dialog.close();
  lastDialogTrigger?.focus();
}

document.querySelectorAll("[data-lightbox]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    if (!dialog || !dialogMedia || !dialogCaption) return;
    lastDialogTrigger = trigger;

    const cropName = trigger.dataset.lightbox;
    const crop = document.createElement("span");
    crop.className = `image-crop crop-${cropName} media-frame`;
    crop.dataset.fallbackLabel = "상세 이미지 준비 중";

    const image = document.createElement("img");
    image.src = trigger.dataset.lightboxSrc;
    image.alt = trigger.dataset.lightboxAlt;
    image.addEventListener("error", () => showImageFallback(image));
    crop.append(image);

    dialogMedia.replaceChildren(crop);
    dialogCaption.textContent = trigger.dataset.lightboxCaption;
    dialog.showModal();
    dialogClose.focus();
  });
});

dialogClose?.addEventListener("click", closeDialog);

dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) closeDialog();
});

dialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDialog();
});

function showImageFallback(image) {
  const frame = image.closest(".media-frame");
  if (!frame || frame.classList.contains("is-missing")) return;

  frame.classList.add("is-missing");
  image.hidden = true;

  const fallback = document.createElement("span");
  fallback.className = "media-fallback";

  const title = document.createElement("strong");
  title.textContent = frame.dataset.fallbackLabel || "이미지 준비 중";

  const description = document.createElement("span");
  description.textContent = image.alt;

  fallback.append(title, description);
  frame.append(fallback);
}

document.querySelectorAll("img").forEach((image) => {
  image.addEventListener("error", () => showImageFallback(image));
  if (image.complete && image.naturalWidth === 0) showImageFallback(image);
});

const revealItems = document.querySelectorAll(".reveal");

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -8%" });

  revealItems.forEach((item) => revealObserver.observe(item));
}

const sectionLinks = [...document.querySelectorAll(".site-nav a[href^='#']")];
const linkedSections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window && linkedSections.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) return;
    sectionLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === `#${visible.target.id}`;
      if (isCurrent) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }, { threshold: [0.2, 0.45, 0.7], rootMargin: "-20% 0px -55%" });

  linkedSections.forEach((section) => sectionObserver.observe(section));
}
