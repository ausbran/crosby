export function initScroll() {
    const SCROLL_ANIMATION_TRIGGER_CLASSNAME = 'fade-in';
    const SCROLL_ANIMATION_OFFSCREEN_CLASSNAME = 'fade-in--offscreen';
    
    let animationOrderCounter = 0; // Initialize a counter for the animation order

    // Scroll in animation logic
    function onIntersection(entries, observer) {
        entries.forEach((entry) => {
            const element = entry.target;

            if (entry.isIntersecting) {
                element.classList.add('visible');
                element.classList.remove(SCROLL_ANIMATION_OFFSCREEN_CLASSNAME);
                observer.unobserve(element);
            }
        });
    }

    function initializeScrollAnimations() {
        const animationElements = document.querySelectorAll(`.${SCROLL_ANIMATION_TRIGGER_CLASSNAME}`);

        if (animationElements.length === 0) return;

        // Reset the counter at the beginning of initializing scroll animations
        animationOrderCounter = 0;

        const observer = new IntersectionObserver(onIntersection, {
            rootMargin: '-50px 0px 0px 0px',
            threshold: 0
        });

        animationElements.forEach((element) => {
            // Exclude .carousel-item elements from being observed
            if (element.closest('.carousel')) return;

            element.classList.add(SCROLL_ANIMATION_OFFSCREEN_CLASSNAME);
            observer.observe(element);
        });
    }

    initializeScrollAnimations();
}
