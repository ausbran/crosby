export function initScale() {
  let scaleUp = null;
  let isActive = false;

  const initialScale = 0.9;
  const maxScale = 1.2;

  function onScroll() {
    if (!scaleUp) return;
    const blockRect = scaleUp.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const distanceFromTop = Math.max(0, viewportHeight - blockRect.top);
    const progress = Math.min(1, distanceFromTop / viewportHeight);
    const scale = initialScale + (maxScale - initialScale) * progress;
    scaleUp.style.transform = `scale(${scale})`;
  }

  function enable() {
    if (isActive) return;
    scaleUp = document.querySelector(".scale-up");
    if (!scaleUp) return;

    isActive = true;
    window.addEventListener("scroll", onScroll);
    onScroll(); // initialize
  }

  function disable() {
    if (!isActive) return;
    window.removeEventListener("scroll", onScroll);
    if (scaleUp) scaleUp.style.transform = ""; // Reset transform
    isActive = false;
    scaleUp = null;
  }

  function handleResize() {
    // if (window.innerWidth > 1023) {
    //   enable();
    // } else {
    //   disable();
    // }
    enable();
  }

  // Debounce resize handler
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 150);
  });

  // Initial check
  handleResize();
}