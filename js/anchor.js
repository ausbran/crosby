import { navHeight } from './globals.js';

export function initAnchor() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', function (event) {
        event.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = targetPosition - navHeight - 30;

            window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth' // Smooth scroll behavior
            });
        }
        });
    });
}