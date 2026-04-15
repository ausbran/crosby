export function initServices() {
  const syncServicesBreakouts = () => {
    const viewportWidth = document.documentElement.clientWidth;
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;

    document
      .querySelectorAll(".slider-wrapper--services-breakout")
      .forEach((wrapper) => {
        if (!isDesktop) {
          wrapper.style.width = "";
          wrapper.style.maxWidth = "";
          wrapper.style.minWidth = "";
          return;
        }

        const { left } = wrapper.getBoundingClientRect();
        const targetWidth = Math.max(viewportWidth - left, 0);

        wrapper.style.width = `${targetWidth}px`;
        wrapper.style.maxWidth = `${targetWidth}px`;
        wrapper.style.minWidth = `${targetWidth}px`;
      });
  };

  syncServicesBreakouts();

  if (!window.__crosbyServicesBreakoutBound) {
    window.addEventListener("resize", syncServicesBreakouts, { passive: true });
    window.__crosbyServicesBreakoutBound = true;
  }

  const serviceSections = document.querySelectorAll("#services");

  serviceSections.forEach((section) => {
    const tabs = Array.from(section.querySelectorAll(".tab-btn"));
    const slideContainers = Array.from(section.querySelectorAll(".service-panel"));
    const panelsTrack = section.querySelector(".service-panels-track");

    if (!tabs.length || !slideContainers.length || !panelsTrack) {
      return;
    }

    let isAnimating = false;

    const getActivePanel = () =>
      slideContainers.find((panel) => panel.classList.contains("is-active"));

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetService = tab.getAttribute("data-service");
        const currentPanel = getActivePanel();
        const nextPanel = slideContainers.find(
          (panel) => panel.getAttribute("data-service") === targetService
        );

        if (!nextPanel || nextPanel === currentPanel || isAnimating) {
          return;
        }

        isAnimating = true;

        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const currentHeight = currentPanel ? currentPanel.offsetHeight : 0;
        nextPanel.classList.add("is-entering");
        nextPanel.setAttribute("aria-hidden", "false");

        const nextHeight = nextPanel.offsetHeight;
        panelsTrack.style.height = `${currentHeight || nextHeight}px`;

        requestAnimationFrame(() => {
          if (currentPanel) {
            currentPanel.classList.add("is-leaving");
            currentPanel.classList.remove("is-active");
            currentPanel.setAttribute("aria-hidden", "true");
          }

          nextPanel.classList.add("is-active");
          nextPanel.classList.remove("is-entering");
          panelsTrack.style.height = `${nextHeight}px`;
        });

        window.setTimeout(() => {
          if (currentPanel) {
            currentPanel.classList.remove("is-leaving");
          }

          panelsTrack.style.height = "";
          isAnimating = false;
        }, 360);
      });
    });
  });
}
