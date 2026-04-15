const CONSENT_KEY = "crosby-cookie-consent-v1";
const CONSENT_CONTENT_FADE_MS = 180;
const CONSENT_HEIGHT_ANIMATION_MS = 240;

function getStoredConsent() {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn("Unable to read cookie consent preferences.", error);
    return null;
  }
}

function setStoredConsent(preferences) {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("Unable to persist cookie consent preferences.", error);
  }
}

function hideElement(element) {
  if (!element) {
    return;
  }

  element.classList.add("hidden");
  element.classList.remove("flex");
  element.setAttribute("aria-hidden", "true");
}

function showElement(element, displayClass = "flex") {
  if (!element) {
    return;
  }

  element.classList.remove("hidden");
  if (displayClass) {
    element.classList.add(displayClass);
  }
  element.setAttribute("aria-hidden", "false");
}

function applyConsent(preferences) {
  if (typeof window.__crosbyUpdateConsent === "function") {
    window.__crosbyUpdateConsent(preferences);
  }

  if (
    (preferences.analytics || preferences.marketing) &&
    typeof window.__crosbyEnableTracking === "function"
  ) {
    window.__crosbyEnableTracking();
  }

  document.dispatchEvent(
    new CustomEvent("crosby:consent-updated", {
      detail: preferences,
    }),
  );
}

export function initConsent() {
  const banner = document.getElementById("cookie-consent-banner");
  const shell = document.getElementById("cookie-consent-shell");
  const summary = document.getElementById("cookie-consent-summary");
  const preferencesPanel = document.getElementById("cookie-consent-preferences");
  const analyticsInput = document.getElementById("cookie-consent-analytics");
  const marketingInput = document.getElementById("cookie-consent-marketing");
  const footerTrigger = document.getElementById("open-cookie-preferences");

  if (!banner || !shell || !summary || !preferencesPanel) {
    return;
  }

  let currentView = "summary";
  let isTransitioning = false;

  const syncInputs = (preferences) => {
    if (analyticsInput) {
      analyticsInput.checked = !!preferences.analytics;
    }
    if (marketingInput) {
      marketingInput.checked = !!preferences.marketing;
    }
  };

  const setSectionVisible = (section, visible) => {
    if (!section) {
      return;
    }

    section.classList.toggle("hidden", !visible);
    section.classList.toggle("opacity-0", !visible);
    section.classList.toggle("translate-y-2", !visible);
    section.classList.toggle("pointer-events-none", !visible);
    section.classList.toggle("opacity-100", visible);
    section.classList.toggle("translate-y-0", visible);
    section.setAttribute("aria-hidden", visible ? "false" : "true");
  };

  const measureSectionHeight = (section) => {
    if (!section) {
      return 0;
    }

    const wasHidden = section.classList.contains("hidden");
    const originalStyle = section.getAttribute("style");

    if (wasHidden) {
      section.classList.remove("hidden");
      section.style.position = "absolute";
      section.style.visibility = "hidden";
      section.style.pointerEvents = "none";
      section.style.inset = "0";
      section.style.width = "100%";
    }

    const height = section.scrollHeight;

    if (wasHidden) {
      section.classList.add("hidden");
      if (originalStyle === null) {
        section.removeAttribute("style");
      } else {
        section.setAttribute("style", originalStyle);
      }
    }

    return height;
  };

  const setViewImmediate = (view) => {
    currentView = view;
    setSectionVisible(summary, view === "summary");
    setSectionVisible(preferencesPanel, view === "preferences");
    shell.style.height = "";
  };

  const switchView = (view) => {
    if (currentView === view || isTransitioning) {
      shell.style.height = "";
      return;
    }

    isTransitioning = true;

    const currentSection = currentView === "summary" ? summary : preferencesPanel;
    const nextSection = view === "summary" ? summary : preferencesPanel;
    const startHeight = shell.offsetHeight || measureSectionHeight(currentSection);

    shell.style.height = `${startHeight}px`;

    requestAnimationFrame(() => {
      currentSection.classList.add("opacity-0", "translate-y-2", "pointer-events-none");
      currentSection.classList.remove("opacity-100", "translate-y-0");
    });

    window.setTimeout(() => {
      currentSection.classList.add("hidden");
      currentSection.setAttribute("aria-hidden", "true");

      nextSection.classList.remove("hidden");
      nextSection.classList.add("opacity-0", "translate-y-2", "pointer-events-none");
      nextSection.classList.remove("opacity-100", "translate-y-0");
      nextSection.setAttribute("aria-hidden", "false");

      const endHeight = nextSection.scrollHeight;
      let heightSettled = false;

      const revealNextSection = () => {
        if (heightSettled) {
          return;
        }

        heightSettled = true;
        nextSection.classList.remove("opacity-0", "translate-y-2", "pointer-events-none");
        nextSection.classList.add("opacity-100", "translate-y-0");
        currentView = view;

        window.setTimeout(() => {
          shell.style.height = "";
          isTransitioning = false;
        }, CONSENT_CONTENT_FADE_MS);
      };

      const onHeightTransitionEnd = (event) => {
        if (event.target !== shell || event.propertyName !== "height") {
          return;
        }

        shell.removeEventListener("transitionend", onHeightTransitionEnd);
        revealNextSection();
      };

      shell.addEventListener("transitionend", onHeightTransitionEnd);

      requestAnimationFrame(() => {
        shell.style.height = `${endHeight}px`;
      });

      window.setTimeout(() => {
        shell.removeEventListener("transitionend", onHeightTransitionEnd);
        revealNextSection();
      }, CONSENT_HEIGHT_ANIMATION_MS + 80);
    }, CONSENT_CONTENT_FADE_MS);
  };

  const openPanel = () => {
    showElement(banner, "block");
  };

  const hidePanel = () => {
    hideElement(banner);
    shell.style.height = "";
  };

  const openPreferences = (event) => {
    if (event) {
      event.preventDefault();
    }

    const current = getStoredConsent() || { analytics: false, marketing: false };
    syncInputs(current);
    openPanel();
    switchView("preferences");
  };

  const closePreferences = () => {
    if (getStoredConsent()) {
      hidePanel();
      return;
    }

    switchView("summary");
  };

  const finalizeConsent = (preferences) => {
    setStoredConsent(preferences);
    applyConsent(preferences);
    hidePanel();
  };

  const savedConsent = getStoredConsent();

  if (savedConsent) {
    setViewImmediate("summary");
    hidePanel();
    syncInputs(savedConsent);
  } else {
    setViewImmediate("summary");
    openPanel();
  }

  if (footerTrigger) {
    footerTrigger.addEventListener("click", openPreferences);
  }

  document.querySelectorAll("[data-consent-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-consent-action");

      switch (action) {
        case "accept":
          finalizeConsent({ analytics: true, marketing: true });
          break;
        case "reject":
          finalizeConsent({ analytics: false, marketing: false });
          break;
        case "open-preferences":
          openPreferences();
          break;
        case "close-preferences":
          closePreferences();
          break;
        case "save-preferences":
          finalizeConsent({
            analytics: !!(analyticsInput && analyticsInput.checked),
            marketing: !!(marketingInput && marketingInput.checked),
          });
          break;
        default:
          break;
      }
    });
  });
}
