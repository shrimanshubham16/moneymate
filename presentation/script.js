// Cinematic Anime Presentation Script

let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const totalSlides = slides.length;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    showSlide(0);
    setupScrollNavigation();
    setupDotNavigation();
    setupKeyboardNavigation();
    startContinuousAnimations();
});

// Show specific slide
function showSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    
    slides.forEach(slide => {
        slide.classList.remove('active');
    });
    
    slides[index].classList.add('active');
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    currentSlide = index;
    
    triggerSlideAnimations(index);
    scrollToTop();
}

// Setup scroll navigation
function setupScrollNavigation() {
    let isScrolling = false;
    
    window.addEventListener('wheel', (e) => {
        if (isScrolling) return;
        
        isScrolling = true;
        
        if (e.deltaY > 0) {
            showSlide(currentSlide + 1);
        } else {
            showSlide(currentSlide - 1);
        }
        
        setTimeout(() => {
            isScrolling = false;
        }, 1000);
    }, { passive: true });
    
    // Touch swipe
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].screenY;
        const diff = touchStartY - touchEndY;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                showSlide(currentSlide + 1);
            } else {
                showSlide(currentSlide - 1);
            }
        }
    }, { passive: true });
}

// Setup dot navigation
function setupDotNavigation() {
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
        });
    });
}

// Setup keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowDown':
            case 'PageDown':
            case ' ':
                e.preventDefault();
                showSlide(currentSlide + 1);
                break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                showSlide(currentSlide - 1);
                break;
            case 'Home':
                e.preventDefault();
                showSlide(0);
                break;
            case 'End':
                e.preventDefault();
                showSlide(totalSlides - 1);
                break;
        }
    });
}

// Trigger slide-specific animations
function triggerSlideAnimations(slideIndex) {
    const slide = slides[slideIndex];
    if (!slide) return;
    
    // Reset and restart animations
    const animatedElements = slide.querySelectorAll('[class*="animate"], [class*="float"], [class*="pulse"]');
    animatedElements.forEach((el) => {
        el.style.animation = 'none';
        setTimeout(() => {
            el.style.animation = '';
        }, 10);
    });
}

// Start continuous animations
function startContinuousAnimations() {
    // Cloud drift
    const clouds = document.querySelectorAll('.cloud');
    clouds.forEach((cloud, i) => {
        cloud.style.animationDelay = `${i * 8}s`;
    });
    
    // Particles
    const particles = document.querySelectorAll('.particle, .rain-drop');
    particles.forEach((particle, i) => {
        particle.style.animationDelay = `${i * 0.5}s`;
    });
    
    // Waves
    const waves = document.querySelectorAll('.wave');
    waves.forEach((wave, i) => {
        wave.style.animationDelay = `${i * 1.3}s`;
    });
}

// Scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Prevent default scroll
document.body.style.overflow = 'hidden';

console.log('🎬 Cinematic Presentation Ready! Navigate with scroll, arrows, or dots.');
