function getNavOffset() {
  const nav = document.querySelector("nav");
  return nav ? nav.offsetHeight : 0;
}

export function initInstructionToc(container = document) {
  const page = container.querySelector("[data-instruction-page]");

  if (!page) {
    return;
  }

  const cleanup = page.__instructionTocCleanup;
  if (typeof cleanup === "function") {
    cleanup();
  }

  const toc = page.querySelector("[data-instruction-toc]");
  const links = Array.from(page.querySelectorAll("[data-instruction-toc-link]"));
  const sections = Array.from(
    page.querySelectorAll("[data-instruction-section][id]"),
  );

  if (!toc || !links.length || !sections.length) {
    return;
  }

  const controller = new AbortController();
  const { signal } = controller;
  const linkMap = new Map(
    links.map((link) => [link.dataset.instructionTocLink, link]),
  );
  let activeId = "";
  let ticking = false;

  const setActiveLink = (id) => {
    if (!id || activeId === id) {
      return;
    }

    activeId = id;
    const parentId = id.includes("--") ? id.split("--")[0] : "";

    links.forEach((link) => {
      const linkId = link.dataset.instructionTocLink;
      const isActive = linkId === id;
      const isActiveParent = parentId && linkId === parentId;

      link.classList.toggle("is-active", isActive);
      link.classList.toggle("is-active-parent", Boolean(isActiveParent));

      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    const currentLink = linkMap.get(id);
    if (currentLink) {
      currentLink.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }
  };

  const getActiveSectionId = () => {
    const marker =
      getNavOffset() +
      (window.innerWidth >= 1024 ? 88 : 64) +
      Math.min(window.innerHeight * 0.12, 72);
    let currentId = sections[0].id;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();

      if (rect.top <= marker) {
        currentId = section.id;
      }

      if (rect.top <= marker && rect.bottom > marker) {
        currentId = section.id;
      }
    });

    return currentId;
  };

  const updateActiveState = () => {
    ticking = false;
    setActiveLink(getActiveSectionId());
  };

  const queueUpdate = () => {
    if (ticking) {
      return;
    }

    ticking = true;
    window.requestAnimationFrame(updateActiveState);
  };

  links.forEach((link) => {
    link.addEventListener(
      "click",
      (event) => {
        const hash = link.getAttribute("href");
        const target = hash ? page.querySelector(hash) : null;

        if (!target) {
          return;
        }

        event.preventDefault();

        const top =
          target.getBoundingClientRect().top +
          window.scrollY -
          getNavOffset() -
          (window.innerWidth >= 1024 ? 48 : 24);

        window.history.replaceState(null, "", hash);
        window.scrollTo({
          top,
          behavior: "smooth",
        });

        setActiveLink(target.id);
      },
      { signal },
    );
  });

  window.addEventListener("scroll", queueUpdate, {
    passive: true,
    signal,
  });
  window.addEventListener("resize", queueUpdate, {
    passive: true,
    signal,
  });
  window.addEventListener(
    "hashchange",
    () => {
      const id = window.location.hash.replace(/^#/, "");
      if (linkMap.has(id)) {
        setActiveLink(id);
        return;
      }

      queueUpdate();
    },
    { signal },
  );

  const initialHashId = window.location.hash.replace(/^#/, "");
  const initialSection = sections.find((section) => section.id === initialHashId);

  if (initialSection) {
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top:
          initialSection.getBoundingClientRect().top +
          window.scrollY -
          getNavOffset() -
          (window.innerWidth >= 1024 ? 48 : 24),
      });
      setActiveLink(initialSection.id);
    });
  } else {
    queueUpdate();
  }

  page.__instructionTocCleanup = () => {
    controller.abort();
    delete page.__instructionTocCleanup;
  };
}
