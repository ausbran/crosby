let scaleCleanup = null;

export function initScale() {
  if (typeof scaleCleanup === "function") {
    scaleCleanup();
  }

  let scaleUp = document.querySelector(".scale-up");
  if (!scaleUp) {
    scaleCleanup = null;
    return;
  }

  const initialScale = 0.9;
  const maxScale = 1.2;
  let resizeTimeout = null;
  let rafId = null;

  function applyScale() {
    if (!scaleUp || !document.body.contains(scaleUp)) {
      return;
    }

    const blockRect = scaleUp.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const distanceFromTop = Math.max(0, viewportHeight - blockRect.top);
    const progress = Math.min(1, distanceFromTop / viewportHeight);
    const scale = initialScale + (maxScale - initialScale) * progress;
    scaleUp.style.transform = `scale(${scale})`;
  }

  function scheduleApplyScale() {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }

    rafId = window.requestAnimationFrame(() => {
      applyScale();
    });
  }

  function handleResize() {
    scaleUp = document.querySelector(".scale-up");
    scheduleApplyScale();
  }

  function onResize() {
    window.clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(handleResize, 150);
  }

  window.addEventListener("scroll", scheduleApplyScale);
  window.addEventListener("resize", onResize);
  window.addEventListener("load", scheduleApplyScale, { once: true });

  scheduleApplyScale();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(scheduleApplyScale);
  });

  scaleCleanup = () => {
    window.removeEventListener("scroll", scheduleApplyScale);
    window.removeEventListener("resize", onResize);
    window.clearTimeout(resizeTimeout);
    if (rafId) {
      window.cancelAnimationFrame(rafId);
    }
    if (scaleUp && document.body.contains(scaleUp)) {
      scaleUp.style.transform = "";
    }
    scaleUp = null;
  };
}
