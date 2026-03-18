export function initLanding(carouselSelector, progressBarSelector) {
    const carousel = document.querySelector(carouselSelector);
    const progressBar = document.querySelector(progressBarSelector);
    if (!carousel || !progressBar) return;

    const slideTime = parseInt(carousel.dataset.slideTime, 10) * 1000 || 15000;
    const pauseTime = 400;
    const items = carousel.querySelectorAll('.carousel-item');
    let index = 0;

    function showNextImage() {
        items[index].classList.remove('active');
        index = (index + 1) % items.length;
        items[index].classList.add('active');

        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        setTimeout(() => {
            progressBar.style.transition = `width ${slideTime}ms linear`;
            progressBar.style.width = '100%';
        }, 100);
    }

    function startCarousel() {
        setInterval(() => {
            showNextImage();
        }, slideTime + pauseTime);
    }

    items[index].classList.add('active');
    progressBar.style.transition = `width ${slideTime}ms linear`;
    progressBar.style.width = '100%';

    startCarousel();
}