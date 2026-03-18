export function initServices() {
  const tabs = document.querySelectorAll(".tab-btn");
  const slideContainers = document.querySelectorAll(".slides-container");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetService = tab.getAttribute("data-service");

      // Update active tab
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Handle fade-out and fade-in transitions
      slideContainers.forEach((container) => {
        if (container.getAttribute("data-service") === targetService) {
          setTimeout(() => {
            container.classList.add("fade-in", "visible");
            container.classList.remove("fade-out", "!hidden");
          }, 300); // Delay to match fade-out duration
        } else if (!container.classList.contains("!hidden")) {
          container.classList.add("fade-out");
          container.classList.remove("fade-in", "visible");
          setTimeout(() => container.classList.add("!hidden"), 300); // Match CSS transition duration
        }
      });
    });
  });
}
