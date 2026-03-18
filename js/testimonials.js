export function initTestimonials(carouselSelector, progressBarSelector) {
    // Check if screen size is above lg breakpoint (1024px)
    if (window.innerWidth < 1024) return;

    const carousels = document.querySelectorAll(carouselSelector);
    if (!carousels.length) return;

    carousels.forEach((carousel) => {
        const progressBar = carousel.closest(".testimonials")?.querySelector(progressBarSelector);
        const items = carousel.querySelectorAll(".carousel-item");

        if (!items.length) return;

        const slideTime = parseInt(carousel.dataset.slideTime, 10) * 1000 || 15000;
        const pauseTime = 400;
        let index = 0;
        let interval;

        function showNextSlide() {
            // Ensure fade-in and fade-out classes are only applied to testimonial items
            items[index].classList.remove("active", "fade-in");
            items[index].classList.add("fade-out");

            index = (index + 1) % items.length;

            items[index].classList.remove("fade-out");
            items[index].classList.add("active", "fade-in");

            if (progressBar) {
                progressBar.style.transition = "none";
                progressBar.style.width = "0%";
                setTimeout(() => {
                    progressBar.style.transition = `width ${slideTime}ms linear`;
                    progressBar.style.width = "100%";
                }, 100);
            }
        }

        function startCarousel() {
            interval = setInterval(() => {
                showNextSlide();
            }, slideTime + pauseTime);
        }

        // Initialize the first slide and progress bar
        items.forEach((item) => {
            item.classList.remove("fade-in", "fade-out"); // Ensure clean state
        });
        items[index].classList.add("active", "fade-in");
        if (progressBar) {
            progressBar.style.transition = `width ${slideTime}ms linear`;
            progressBar.style.width = "100%";
        }

        startCarousel();
    });
}

// Listen for screen resize and re-run the function if needed
window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
        initTestimonials(".testimonials .carousel", ".testimonials .progress-bar .progress");
    }
});