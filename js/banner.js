const bannerInstances = new WeakMap();

function clampProgress(value) {
  return Math.min(Math.max(value, 0), 1);
}

function updateLinearProgress(progressBar, ratio) {
  if (!progressBar) {
    return;
  }

  progressBar.style.width = `${clampProgress(ratio) * 100}%`;
}

function updateDotProgress(dotProgresses, activeIndex, ratio) {
  dotProgresses.forEach((progress, index) => {
    const scale = index === activeIndex ? clampProgress(ratio) : 0;
    progress.style.transform = `scaleX(${scale})`;
  });
}

function stopBanner(instance) {
  if (!instance) {
    return;
  }

  if (instance.timeoutId) {
    window.clearTimeout(instance.timeoutId);
    instance.timeoutId = null;
  }

  if (instance.rafId) {
    window.cancelAnimationFrame(instance.rafId);
    instance.rafId = null;
  }

  if (instance.abortController) {
    instance.abortController.abort();
    instance.abortController = null;
  }
}

function setActiveSlide(instance, nextIndex) {
  instance.index = nextIndex;

  instance.mediaItems.forEach((item, index) => {
    const isActive = index === nextIndex;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  instance.contentItems.forEach((item, index) => {
    const isActive = index === nextIndex;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  instance.dotButtons.forEach((button, index) => {
    button.classList.toggle("is-active", index === nextIndex);
  });

  updateLinearProgress(instance.progressBar, 0);
  updateDotProgress(instance.dotProgresses, nextIndex, 0);
}

function startBannerTimer(instance) {
  if (instance.timeoutId) {
    window.clearTimeout(instance.timeoutId);
    instance.timeoutId = null;
  }

  if (instance.rafId) {
    window.cancelAnimationFrame(instance.rafId);
    instance.rafId = null;
  }

  if (instance.mediaItems.length <= 1) {
    updateLinearProgress(instance.progressBar, 1);
    updateDotProgress(instance.dotProgresses, instance.index, 1);
    return;
  }

  instance.startedAt = performance.now();

  const tick = (timestamp) => {
    const elapsed = timestamp - instance.startedAt;
    const ratio = elapsed / instance.slideTime;

    updateLinearProgress(instance.progressBar, ratio);
    updateDotProgress(instance.dotProgresses, instance.index, ratio);

    if (ratio < 1) {
      instance.rafId = window.requestAnimationFrame(tick);
    }
  };

  instance.rafId = window.requestAnimationFrame(tick);
  instance.timeoutId = window.setTimeout(() => {
    const nextIndex = (instance.index + 1) % instance.mediaItems.length;
    setActiveSlide(instance, nextIndex);
    startBannerTimer(instance);
  }, instance.slideTime);
}

export function initBanner(carouselSelector, progressBarSelector) {
  const carousels = document.querySelectorAll(carouselSelector);

  if (!carousels.length) {
    return;
  }

  carousels.forEach((carousel) => {
    const banner = carousel.closest(".banner");
    if (!banner) {
      return;
    }

    const existingInstance = bannerInstances.get(banner);
    if (existingInstance) {
      stopBanner(existingInstance);
      bannerInstances.delete(banner);
    }

    const mediaItems = Array.from(carousel.querySelectorAll(".carousel-item"));
    if (!mediaItems.length) {
      return;
    }

    const progressBar = progressBarSelector
      ? banner.querySelector(progressBarSelector)
      : null;
    const contentItems = Array.from(banner.querySelectorAll("[data-banner-content]"));
    const dotButtons = Array.from(banner.querySelectorAll("[data-banner-dot]"));
    const dotProgresses = Array.from(
      banner.querySelectorAll("[data-banner-dot-progress]"),
    );
    const abortController = new AbortController();
    const slideTime = (parseInt(carousel.dataset.slideTime, 10) || 8) * 1000;

    const instance = {
      abortController,
      contentItems,
      dotButtons,
      dotProgresses,
      index: 0,
      mediaItems,
      progressBar,
      rafId: null,
      slideTime,
      startedAt: performance.now(),
      timeoutId: null,
    };

    if (contentItems.length) {
      contentItems.forEach((item, index) => {
        item.setAttribute("aria-hidden", index === 0 ? "false" : "true");
      });
    }

    dotButtons.forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const targetIndex = parseInt(button.dataset.bannerTarget, 10);
          if (Number.isNaN(targetIndex) || targetIndex === instance.index) {
            return;
          }

          setActiveSlide(instance, targetIndex);
          startBannerTimer(instance);
        },
        { signal: abortController.signal },
      );
    });

    bannerInstances.set(banner, instance);
    setActiveSlide(instance, 0);
    startBannerTimer(instance);
  });
}
