import barba from "@barba/core";
import { gsap } from "gsap";
import { initNavigation, resetNav } from "./navigation.js";
import { initSlider } from "./slider.js";
import { initBanner } from "./banner.js";
import { initScroll } from "./scroll.js";
import { initTestimonials } from "./testimonials.js";
import { initContact } from "./contact.js";
import { initScale } from "./scale.js";
import { initServices } from "./services.js";
import { initAnchor } from "./anchor.js";
import { initMap } from "./map.js";
import { initSliderFixed } from "./sliderFixed.js";
import { initInstructionToc } from "./instruction.js";
import { initStreamingVideo } from "./streamingVideo.js";

const HEAD_DYNAMIC_SELECTORS = [
  'meta[name="generator"]',
  'meta[name="keywords"]',
  'meta[name="description"]',
  'meta[name="referrer"]',
  'meta[name="robots"]',
  'meta[name^="twitter:"]',
  "meta[property]",
  'link[rel="canonical"]',
  'link[rel="alternate"]',
  'link[rel="prev"]',
  'link[rel="next"]',
  'link[rel="home"]',
  'link[rel="author"]',
];
const STRUCTURED_DATA_SELECTOR = 'script[type="application/ld+json"]';

function syncBodyClass(classList = "") {
  const body = document.body;
  if (!body) {
    return;
  }

  const prevClasses = (body.dataset.pageClass || "")
    .split(/\s+/)
    .map((cls) => cls.trim())
    .filter(Boolean);
  const nextClasses = (classList || "")
    .split(/\s+/)
    .map((cls) => cls.trim())
    .filter(Boolean);

  prevClasses.forEach((cls) => {
    if (!nextClasses.includes(cls)) {
      body.classList.remove(cls);
    }
  });

  nextClasses.forEach((cls) => {
    if (cls && !body.classList.contains(cls)) {
      body.classList.add(cls);
    }
  });

  body.dataset.pageClass = nextClasses.join(" ");
}

function pushVirtualPageView() {
  const path = window.location.pathname + window.location.search;
  const payload = {
    event: "virtualPageview",
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

function syncStructuredData(html = "") {
  if (!html || typeof DOMParser === "undefined") {
    return;
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const nextStructuredData = Array.from(
    parsed.querySelectorAll(STRUCTURED_DATA_SELECTOR),
  );

  document.querySelectorAll(STRUCTURED_DATA_SELECTOR).forEach((script) => {
    script.remove();
  });

  nextStructuredData.forEach((script) => {
    const replacement = document.createElement("script");
    replacement.type = "application/ld+json";
    replacement.text = script.textContent || "";
    document.body.appendChild(replacement);
  });
}

function syncHeadMetadata(html = "") {
  if (!html || typeof DOMParser === "undefined") {
    return;
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  const selector = HEAD_DYNAMIC_SELECTORS.join(", ");
  const nextHeadNodes = Array.from(parsed.head.querySelectorAll(selector));

  if (parsed.title) {
    document.title = parsed.title;
  }

  if (parsed.documentElement.lang) {
    document.documentElement.lang = parsed.documentElement.lang;
  }

  document.head.querySelectorAll(selector).forEach((node) => {
    node.remove();
  });

  nextHeadNodes.forEach((node) => {
    document.head.appendChild(node.cloneNode(true));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  const mainEl = document.querySelector("main");
  const namespace = mainEl ? mainEl.dataset.barbaNamespace : undefined;
  const pageClass =
    (mainEl && mainEl.dataset.bodyClass) ||
    document.body.dataset.pageClass ||
    "";
  syncBodyClass(pageClass);
  initializeComponents(document, namespace);
});

function initializeComponents(container, namespace) {
  initScroll();
  initInstructionToc(container);
  initStreamingVideo(container);

  switch (namespace) {
    case "home":
      initSliderFixed();
      initSlider();
      initBanner(".banner .carousel", ".banner .progress-bar .progress", ".banner .background");
      break;
    case "history":
      initSlider();
      break;
    case "contact":
      initSlider();
      initContact();
      initBanner(".banner .carousel", ".banner .progress-bar .progress", ".banner .background");
      break;
    case "team":
      initSlider();
      initContact();
      initBanner(".banner .carousel", ".banner .progress-bar .progress", ".banner .background");
      break;
    case "landServices":
      initScale();
      initBanner(".banner .carousel", ".banner .progress-bar .progress", ".banner .background");
    case "company":
      initAnchor();
      initServices();
      initSlider();
      initBanner(".banner .carousel", ".banner .progress-bar .progress", ".banner .background");
      initTestimonials(".testimonials .carousel", ".testimonials .progress-bar .progress");
      break;
    case "blog":
      initSlider();
      break;
    case "landSales":
      initMap();
      break;
    case "huntingLeases":
      initMap();
      break;
    case "landOwnership":
      initMap();
      break;
    default: {
      const carousel = container.querySelector(".carousel");
      const slider = container.querySelector(".slider");
      const sliderFixed = container.querySelector(".fixed-slider");

      if (carousel) {
        initBanner(".carousel", ".progress-bar .progress");
      }
      if (slider) {
        initSlider();
      }
      if (sliderFixed) {
        initSliderFixed();
      }
      break;
    }
  }
}

pushVirtualPageView();

if (document.querySelector('[data-barba="wrapper"]')) {
  barba.hooks.after(() => {
    pushVirtualPageView();
  });

  barba.init({
    transitions: [
      {
        name: "fade-transition",

        beforeLeave() {
          resetNav();
        },

        leave(data) {
          return gsap.to(data.current.container, {
            opacity: 0,
            duration: 0.5,
          });
        },

        enter(data) {
          gsap.from(data.next.container, {
            opacity: 0,
            duration: 0.5,
          });
        },

        afterEnter(data) {
          syncHeadMetadata(data.next.html || "");
          syncBodyClass(data.next.container.dataset.bodyClass || "");
          syncStructuredData(data.next.html || "");
          const namespace = data.next.container.dataset.barbaNamespace;
          initializeComponents(data.next.container, namespace);
          window.scrollTo(0, 0);
          initNavigation();
        },
      },
    ],
  });
}
