function animateProgress(progressEl, duration) {
  if (!progressEl) {
    return;
  }

  progressEl.style.transition = "none";
  progressEl.style.transform = "scaleX(0)";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progressEl.style.transition = `transform ${duration}ms linear`;
      progressEl.style.transform = "scaleX(1)";
    });
  });
}

function resetProgress(progressEls, activeIndex) {
  progressEls.forEach((progressEl, index) => {
    progressEl.style.transition = "none";
    progressEl.style.transform = index === activeIndex ? "scaleX(0)" : "scaleX(0)";
  });
}

export function initBanner(carouselSelector, progressBarSelector = ".progress-bar .progress") {
  const carousels = document.querySelectorAll(carouselSelector);

  if (!carousels.length) {
    return;
  }

  carousels.forEach((carousel) => {
    if (carousel.dataset.bannerInitialized === "true") {
      return;
    }

    carousel.dataset.bannerInitialized = "true";

    const banner = carousel.closest(".banner");
    const mediaItems = [...carousel.querySelectorAll("[data-banner-media], .carousel-item")];

    if (!banner || !mediaItems.length) {
      return;
    }

    const contentItems = [...banner.querySelectorAll("[data-banner-content]")];
    const dotButtons = [...banner.querySelectorAll("[data-banner-dot]")];
    const progressEls = [...banner.querySelectorAll("[data-banner-dot-progress]")];
    const legacyProgressBar = banner.querySelector(progressBarSelector);
    const slideTime = (parseInt(carousel.dataset.slideTime || "8", 10) || 8) * 1000;

    let activeIndex = mediaItems.findIndex((item) => item.classList.contains("active"));
    let intervalId;

    if (activeIndex < 0) {
      activeIndex = 0;
    }

    const syncState = (index) => {
      activeIndex = index;

      mediaItems.forEach((item, itemIndex) => {
        const isActive = itemIndex === index;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-hidden", isActive ? "false" : "true");
      });

      contentItems.forEach((item, itemIndex) => {
        item.classList.toggle("is-active", itemIndex === index);
      });

      dotButtons.forEach((button, buttonIndex) => {
        button.classList.toggle("is-active", buttonIndex === index);
      });

      if (progressEls.length) {
        resetProgress(progressEls, index);
        animateProgress(progressEls[index], slideTime);
      } else if (legacyProgressBar) {
        legacyProgressBar.style.transition = "none";
        legacyProgressBar.style.width = "0%";

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            legacyProgressBar.style.transition = `width ${slideTime}ms linear`;
            legacyProgressBar.style.width = "100%";
          });
        });
      }
    };

    const goToSlide = (index) => {
      syncState(index);
    };

    const startAutoplay = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      if (mediaItems.length <= 1) {
        return;
      }

      intervalId = window.setInterval(() => {
        const nextIndex = (activeIndex + 1) % mediaItems.length;
        goToSlide(nextIndex);
      }, slideTime);
    };

    dotButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        goToSlide(index);
        startAutoplay();
      });
    });

    syncState(activeIndex);
    startAutoplay();
  });
}
