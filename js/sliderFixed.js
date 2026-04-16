export function initSliderFixed() {
    const sliderSections = document.querySelectorAll(".slider-fixed");
    const desktopMediaQuery = window.matchMedia("(min-width: 1024px)");

    function moveMainSlides() {
        sliderSections.forEach((section) => {
            const mainSlide = section.querySelector(".main-slide");
            const sliderWrapper = section.querySelector(".slider-wrapper");
            const slider = section.querySelector(".slider");

            if (!mainSlide || !sliderWrapper || !slider) return; // Skip if elements are missing

            if (!desktopMediaQuery.matches) {
                if (!sliderWrapper.contains(mainSlide)) {
                    slider.prepend(mainSlide);
                    mainSlide.classList.remove("lg:block", "hidden"); // Make visible in slider
                }

                // Always start the converted fixed slider at the first card on load/resize.
                slider.scrollLeft = 0;
            } else {
                if (sliderWrapper.contains(mainSlide)) {
                    section.prepend(mainSlide);
                    mainSlide.classList.add("lg:block", "hidden"); // Restore desktop visibility
                }

                slider.scrollLeft = 0;
            }
        });
    }

    // Run on load
    moveMainSlides();

    // Run on resize
    window.addEventListener("resize", moveMainSlides);
}
