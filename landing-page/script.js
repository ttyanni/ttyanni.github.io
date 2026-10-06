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

(() => {
  if (window.__landingPageAnalyticsInitialized) return;
  window.__landingPageAnalyticsInitialized = true;

  const trackEvent = (eventName, parameters) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, parameters);
    }
  };

  const sectionTargets = [
    { selector: "#hero-title", sectionName: "hero" },
    { selector: "#detail-space-title", sectionName: "detail" },
    { selector: "#purchase-title", sectionName: "cta" }
  ]
    .map(({ selector, sectionName }) => ({ element: document.querySelector(selector), sectionName }))
    .filter(({ element }) => element);

  const seenSections = new Set();
  const header = document.getElementById("site-header");
  let sectionObserver;

  const isDocumentVisible = () => document.visibilityState === "visible";

  const isHalfVisibleBelowHeader = (element) => {
    const rect = element.getBoundingClientRect();
    const headerBottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, headerBottom));
    return rect.height > 0 && visibleHeight / rect.height >= 0.5;
  };

  const recordSection = ({ element, sectionName }) => {
    if (!isDocumentVisible() || seenSections.has(sectionName) || !isHalfVisibleBelowHeader(element)) return;
    seenSections.add(sectionName);
    trackEvent("section_view", { section_name: sectionName });
    sectionObserver?.unobserve(element);
  };

  const observeSections = () => {
    sectionObserver?.disconnect();
    if (!("IntersectionObserver" in window)) return;

    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const target = sectionTargets.find(({ element }) => element === entry.target);
          if (target) recordSection(target);
        }
      });
    }, {
      threshold: 0.5,
      rootMargin: `-${headerHeight}px 0px 0px 0px`
    });

    sectionTargets.forEach((target) => {
      if (!seenSections.has(target.sectionName)) sectionObserver.observe(target.element);
    });
  };

  observeSections();

  window.addEventListener("resize", observeSections);
  document.addEventListener("visibilitychange", () => {
    if (isDocumentVisible()) sectionTargets.forEach(recordSection);
  });

  const ctaButtons = new Set([
    ...document.querySelectorAll("#cta-hero, [data-cta-location='hero']"),
    ...document.querySelectorAll("#cta-final, [data-cta-location='final']")
  ]);

  ctaButtons.forEach((button) => {
    const buttonLocation = button.matches("#cta-hero, [data-cta-location='hero']") ? "hero" : "final";
    button.addEventListener("click", () => {
      trackEvent("cta_click", { button_location: buttonLocation });
    });
  });
})();
