export function initSliderFixed() {
    const sliderSections = document.querySelectorAll(".slider-fixed");

    function moveMainSlides() {
        sliderSections.forEach((section) => {
            const mainSlide = section.querySelector(".main-slide");
            const sliderWrapper = section.querySelector(".slider-wrapper");
            const slider = section.querySelector(".slider");

            if (!mainSlide || !sliderWrapper || !slider) return; // Skip if elements are missing

            if (window.innerWidth < 1024) {
                if (!sliderWrapper.contains(mainSlide)) {
                    slider.prepend(mainSlide);
                    mainSlide.classList.remove("lg:block", "hidden"); // Make visible in slider
                }
            } else {
                if (sliderWrapper.contains(mainSlide)) {
                    section.prepend(mainSlide);
                    mainSlide.classList.add("lg:block", "hidden"); // Restore desktop visibility
                }
            }
        });
    }

    // Run on load
    moveMainSlides();

    // Run on resize
    window.addEventListener("resize", moveMainSlides);
}