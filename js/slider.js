export function initSlider() {
  const sliders = document.querySelectorAll(".slider");

  sliders.forEach((slider) => {
    const slides = Array.from(slider.querySelectorAll(".slide")); // Get slides
    const sliderWrapper = slider.closest(".slider-wrapper");
    const parentContainer =
      sliderWrapper.closest(".slider-button-js") || sliderWrapper;

    // Safely find the arrows
    const nextButton = parentContainer.querySelector(".arrow-next");
    const prevButton = parentContainer.querySelector(".arrow-prev");

    if (!slides.length) return; // Skip if no slides

    const scrollToSlide = (direction) => {
      const sliderRect = slider.getBoundingClientRect();
      const scrollLeft = slider.scrollLeft;
      let targetSlide = null;

      if (direction === "next") {
        for (let slide of slides) {
          const slideRect = slide.getBoundingClientRect();
          const isFullyVisible =
            slideRect.left >= sliderRect.left &&
            slideRect.right <= sliderRect.right;

          if (!isFullyVisible && slide.offsetLeft > scrollLeft) {
            targetSlide = slide;
            break;
          }
        }
      } else if (direction === "prev") {
        for (let i = slides.length - 1; i >= 0; i--) {
          const slide = slides[i];
          if (slide.offsetLeft < scrollLeft) {
            targetSlide = slide;
            break;
          }
        }
      }

      // Scroll to the target slide
      if (targetSlide) {
        slider.scrollTo({
          left: targetSlide.offsetLeft,
          behavior: "smooth",
        });
      } else {
        // Handle looping
        slider.scrollTo({
          left: direction === "next" ? 0 : slider.scrollWidth,
          behavior: "smooth",
        });
      }
    };

    // Add event listeners for the arrows
    if (nextButton) {
      nextButton.addEventListener("click", (event) => {
        event.preventDefault();
        scrollToSlide("next");
      });
    }

    if (prevButton) {
      prevButton.addEventListener("click", (event) => {
        event.preventDefault();
        scrollToSlide("prev");
      });
    }
  });
}