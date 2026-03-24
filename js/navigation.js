import { nav, navState, main, footer } from "./globals.js";

export function resetNav() {
  const menuBg = document.querySelector('.nav-bg-overlay');
  const activePrimary = document.querySelector(".primary-links > li.active");
  const activeSecondary = document.querySelector(".secondary-links");
  const primaryNavLinks = document.querySelectorAll(".primary-links > li");

  if (main) {
    main.classList.remove("blur-md");
  }

  if (footer) {
    footer.classList.remove("blur-md");
  }

  if (activePrimary) {
    activePrimary.classList.remove("active");
  }

  primaryNavLinks.forEach((primary) => {
    primary.classList.remove('active')
  });

  if (activeSecondary) {
    activeSecondary.classList.add("fade-out");
    activeSecondary.classList.remove(
      "visible",
      "opacity-100",
      "pointer-events-auto"
    );
  }

  if (menuBg) {
    menuBg.style.transition = "height 0.3s ease";
    menuBg.style.height = "0px";
  }
}

export function initNavigation() {
  let lastScrollY = window.scrollY;
  let activePrimary = null;
  let activeSecondary = null;
  let currentMode = null;
  const navHeight = nav.offsetHeight;
  const primaryMenu = document.getElementById("mobile-primary");
  const hamburger = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobile-menu");
  const closeButton = document.getElementById("close-menu");
  const backButtons = document.querySelectorAll(".back-button");
  const secondaryMenus = document.querySelectorAll(".mobile-secondary");
  const primaryLinks = document.querySelectorAll(".primary-link");
  const primaryNavLinks = document.querySelectorAll(".primary-links > li");
  const navContainer = document.getElementById("main-nav");

  // desktop scroll logic
  function handleScroll() {
    if (!navState.allowNavScrollLogic) return;

    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY && currentScrollY > navHeight) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
    lastScrollY = currentScrollY;
  }

  // desktop
  function initDesktopMenu() {
    const menuBg = document.querySelector('.nav-bg-overlay');

    primaryNavLinks.forEach((primary) => {
      const secondaryMenu = primary.querySelector(".secondary-links");

      primary.addEventListener("mouseenter", () => {
        main.classList.add("blur-md");
        footer.classList.add("blur-md");

        const submenu = primary.querySelector('.secondary-links');
        if (submenu) {
          const submenuHeight = submenu.scrollHeight;
          menuBg.style.height = `${submenuHeight}px`;
        }

        if (activePrimary && activePrimary !== primary) {
          activePrimary.classList.remove("active");
        }

        if (activeSecondary && activeSecondary !== secondaryMenu) {
          activeSecondary.classList.add("fade-out");

          setTimeout(() => {
            activeSecondary.classList.remove(
              "visible",
              "opacity-100",
              "pointer-events-auto"
            );
          }, 150);
        }

        primary.classList.add("active");

        if (secondaryMenu) {
          secondaryMenu.classList.remove("fade-out");
          secondaryMenu.classList.add("visible", "opacity-100", "pointer-events-auto");

          activeSecondary = secondaryMenu;
        }

        activePrimary = primary;
      });
    });

    // ✅ Only hide menus when leaving nav entirely
    navContainer.addEventListener("mouseleave", resetNav);

    document.querySelectorAll(".secondary-links a").forEach(link => {
      link.addEventListener("click", () => {
        resetNav(); // fade out nav BEFORE Barba transition
      });
    });
  }

  // ✅ Mobile: Slide menu logic (UNCHANGED)
  function initMobileMenu() {
    const toggleMobileMenu = () => {
      mobileMenu.classList.toggle("translate-x-full");
      mobileMenu.classList.toggle("translate-x-0");

      if (hamburger.classList.contains("animate")) {
        hamburger.classList.remove("animate");
        hamburger.classList.add("animate-reverse");
      } else {
        hamburger.classList.remove("animate-reverse");
        hamburger.classList.add("animate");
      }
    };

    const resetMobileMenu = () => {
      mobileMenu.classList.add("translate-x-full");
      mobileMenu.classList.remove("translate-x-0");
      hamburger.classList.remove("animate");
      hamburger.classList.add("animate-reverse");

      primaryMenu.classList.remove("translate-x-full");
      secondaryMenus.forEach((menu) => {
        menu.classList.add("hidden");
        menu.classList.remove("translate-x-0");
      });
      primaryLinks.forEach((primary) => primary.classList.remove("hidden"));
    };

    hamburger.addEventListener("click", () => {
      toggleMobileMenu();
    });

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        resetMobileMenu();
      });
    }

    primaryLinks.forEach((button) => {
      const secondaryMenu = document.querySelector(button.dataset.secondary);
      button.addEventListener("click", () => {
        primaryLinks.forEach((primary) => primary.classList.add("opacity-0"));
        secondaryMenu.classList.add("translate-x-0");
        activeSecondary = secondaryMenu;
      });
    });

    backButtons.forEach((backButton) => {
      backButton.addEventListener("click", () => {
        if (activeSecondary) {
          activeSecondary.classList.remove("translate-x-0");
          primaryMenu.classList.remove("translate-x-full");
          activeSecondary = null;
        }
        primaryLinks.forEach((primary) => primary.classList.remove("opacity-0"));
      });
    });
  }

  function initializeMenu() {
    const isDesktop = window.innerWidth >= 768;
    const newMode = isDesktop ? 'desktop' : 'mobile';

    if (newMode === currentMode) return; // prevent duplicate init

    // Clean up
    window.removeEventListener("scroll", handleScroll);

    // Init correct menu
    if (isDesktop) {
      initDesktopMenu();
    } else {
      initMobileMenu();
    }

    // Update current mode
    currentMode = newMode;

    // Re-attach scroll handler
    window.addEventListener("scroll", handleScroll);

    if (hamburger.classList.contains("animate") || hamburger.classList.contains("animate-reverse")) {
      hamburger.classList.remove("animate", "animate-reverse");
      mobileMenu.classList.remove("translate-x-0");
      mobileMenu.classList.add("translate-x-full");
    }
  }

  initializeMenu();

  let resizeTimer;
  window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
          initializeMenu();
      }, 200); // Debounce resize to prevent performance issues
  });
  window.addEventListener("scroll", handleScroll);

  // search bar logic
  const searchIcon = document.querySelector(".icons #search-icon");
  const closeSearch = document.getElementById("close-search");
  const searchBar = document.getElementById("search-bar");
  const primaryNav = document.getElementById("desktop-menu");

  if (searchIcon) {
    searchIcon.addEventListener("click", () => {
        primaryNav.classList.add("opacity-0", "pointer-events-none", "-translate-y-full"); // Fade out navigation
        searchBar.classList.remove("invisible", "translate-y-[25px]", "opacity-0"); // Show search bar
        searchBar.classList.add("opacity-100", "pointer-events-auto");
        searchIcon.classList.add("-translate-y-full");
        closeSearch.classList.remove("translate-y-full");
      });

      closeSearch.addEventListener("click", () => {
        primaryNav.classList.remove("opacity-0", "pointer-events-none", "-translate-y-full"); // Restore navigation
        searchBar.classList.add("invisible", "translate-y-[25px]", "opacity-0"); // Hide search bar
        searchBar.classList.remove("opacity-100", "pointer-events-auto");
        searchIcon.classList.remove("-translate-y-full");
        closeSearch.classList.add("translate-y-full");
      });
  }
}