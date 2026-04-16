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
import { initStreamingVideo } from "./streamingVideo.js";
import { initConsent } from "./consent.js";
import { initInstructionToc } from "./instruction.js";

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

document.addEventListener("DOMContentLoaded", () => {
  initConsent();
  initNavigation();
  const mainEl = document.querySelector("main");
  const namespace = mainEl ? mainEl.dataset.barbaNamespace : undefined;
  const pageClass =
    (mainEl && mainEl.dataset.bodyClass) ||
    document.body.dataset.pageClass ||
    "";
  syncBodyClass(pageClass);
  initializeComponents(document, namespace);

  if (typeof barba === "undefined") {
    pushVirtualPageView();
  }
});

function initializeComponents(container, namespace) {
  initScroll();
  initStreamingVideo(container);
  initInstructionToc(container);

  const video = container.querySelector("video");
  if (video) {
    video.play();
  }

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
      break;
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
      const sliderFixed = container.querySelector(".slider-fixed");

      if (carousel) {
        initBanner(".carousel", ".progress-bar .progress");
      }
      if (sliderFixed) {
        initSliderFixed();
      }
      if (slider) {
        initSlider();
      }
      break;
    }
  }
}

if (typeof barba !== "undefined") {
  if (typeof barbaHead !== "undefined") {
    barba.use(barbaHead);
  }

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
          syncBodyClass(data.next.container.dataset.bodyClass || "");
          const namespace = data.next.container.dataset.barbaNamespace;
          initializeComponents(data.next.container, namespace);
          window.scrollTo(0, 0);
          initNavigation();
        },
      },
    ],
  });
} else {
  console.warn("barba.js is not available; page transitions have been skipped.");
}
