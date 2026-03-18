export function initBanner(carouselSelector, progressBarSelector) {
    const carousels = document.querySelectorAll(carouselSelector);

    if (!carousels.length) return;

    carousels.forEach((carousel) => {
        const progressBar = carousel.closest(".banner").querySelector(progressBarSelector);
        const items = carousel.querySelectorAll(".carousel-item");

        if (!items.length) return;

        const slideTime = parseInt(carousel.dataset.slideTime, 10) * 1000 || 15000;
        const pauseTime = 400;
        let index = 0;

        // Recalculate dimensions on window resize without affecting active classes
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const activeItem = carousel.querySelector(".carousel-item.active");
                const activeIndex = Array.from(items).indexOf(activeItem);

                // Ensure the active item remains active after resizing
                items.forEach((item, i) => {
                    item.classList.toggle("active", i === activeIndex);
                });
            }, 100); // Debounce resize events
        });

        if (items.length === 1) {
            items[0].classList.add("active");
            if (progressBar) {
                progressBar.style.transition = "none";
                progressBar.style.width = "100%";
            }
            return;
        }

        function showNextImage() {
            items[index].classList.remove("active");
            index = (index + 1) % items.length;
            items[index].classList.add("active");

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
            setInterval(() => {
                showNextImage();
            }, slideTime + pauseTime);
        }

        items[index].classList.add("active");
        if (progressBar) {
            progressBar.style.transition = `width ${slideTime}ms linear`;
            progressBar.style.width = "100%";
        }

        startCarousel();
    });
}