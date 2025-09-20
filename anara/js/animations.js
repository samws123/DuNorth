// Anara.com Motion Animation System
// Handles scroll-triggered animations, hover effects, and interactive elements

class AnimationSystem {
  constructor() {
    this.observers = new Map();
    this.animatedElements = new Set();
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    this.init();
  }

  init() {
    if (this.isReducedMotion) {
      this.disableAnimations();
      return;
    }

    this.setupIntersectionObserver();
    this.setupScrollReveal();
    this.setupInteractiveElements();
    this.setupStaggeredAnimations();
    this.setupImageAnimations();
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.triggerInitialAnimations());
    } else {
      this.triggerInitialAnimations();
    }
  }

  disableAnimations() {
    // Add no-animations class to body for CSS targeting
    document.body.classList.add('no-animations');
    
    // Immediately show all hidden elements
    const hiddenElements = document.querySelectorAll('.animate-fade-in, .animate-image-blur');
    hiddenElements.forEach(el => {
      el.style.opacity = '1';
      el.style.filter = 'none';
      el.style.transform = 'none';
    });
  }

  setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '0px 0px -100px 0px', // Trigger 100px before element enters viewport
      threshold: 0.1
    };

    this.scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.animatedElements.has(entry.target)) {
          this.animateElement(entry.target);
          this.animatedElements.add(entry.target);
        }
      });
    }, options);

    // Observe all elements that should animate on scroll
    const scrollElements = document.querySelectorAll('.reveal-on-scroll, .animate-fade-in:not(.hero-element)');
    scrollElements.forEach(el => this.scrollObserver.observe(el));
  }

  setupScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(40px)';
    });
  }

  setupInteractiveElements() {
    // Setup button hover effects
    const buttons = document.querySelectorAll('button, .btn, [role="button"]');
    buttons.forEach(button => {
      button.classList.add('animate-scale-hover', 'animate-colors', 'animate-focus');
      
      // Add ripple effect on click
      button.addEventListener('click', (e) => this.createRipple(e));
    });

    // Setup dropdown animations
    const dropdowns = document.querySelectorAll('[data-state]');
    dropdowns.forEach(dropdown => {
      const chevron = dropdown.querySelector('svg');
      if (chevron) {
        chevron.classList.add('animate-chevron');
        
        // Watch for state changes
        const observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
            if (mutation.attributeName === 'data-state') {
              const isOpen = dropdown.getAttribute('data-state') === 'open';
              chevron.classList.toggle('rotate-180', isOpen);
            }
          });
        });
        
        observer.observe(dropdown, { attributes: true });
      }
    });

    // Setup accordion animations
    const accordions = document.querySelectorAll('[data-orientation="vertical"]');
    accordions.forEach(accordion => {
      const icons = accordion.querySelectorAll('svg');
      icons.forEach(icon => icon.classList.add('animate-icon-swap'));
    });
  }

  setupStaggeredAnimations() {
    // Hero section staggered animation
    const heroElements = document.querySelectorAll('.hero-element, .animate-fade-in');
    heroElements.forEach((el, index) => {
      el.style.animationDelay = `${index * 100}ms`;
      el.classList.add(`stagger-${Math.min(index + 1, 5)}`);
    });
  }

  setupImageAnimations() {
    // Setup image blur-in effects
    const images = document.querySelectorAll('img, [data-nimg]');
    images.forEach(img => {
      if (img.complete && img.naturalHeight !== 0) {
        // Image already loaded
        img.classList.add('animate-image-blur', 'animate-in');
      } else {
        // Wait for image to load
        img.classList.add('animate-image-blur');
        img.addEventListener('load', () => {
          setTimeout(() => img.classList.add('animate-in'), 100);
        });
      }
    });
  }

  triggerInitialAnimations() {
    // Trigger hero section animations immediately
    setTimeout(() => {
    const heroElements = document.querySelectorAll('.animate-fade-in');
    heroElements.forEach((el, index) => {
      // Apply inline transition if CSS class not present in stylesheet
      if (!getComputedStyle(el).transitionDuration || getComputedStyle(el).transitionDuration === '0s') {
        el.style.transition = 'opacity 500ms cubic-bezier(0.22, 1, 0.36, 1), transform 600ms cubic-bezier(0.22, 1, 0.36, 1), filter 600ms cubic-bezier(0.22, 1, 0.36, 1)';
      }
      // Ensure initial hidden state
      if (!el.classList.contains('animate-in')) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.filter = 'blur(8px)';
      }
      setTimeout(() => {
        el.classList.add('animate-in');
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.filter = 'none';
      }, index * 100); // Stagger by 100ms
    });
    }, 300); // Small delay for page load
  }

  animateElement(element) {
    if (element.classList.contains('reveal-on-scroll')) {
      element.classList.add('revealed');
    } else if (element.classList.contains('animate-fade-in')) {
      element.classList.add('animate-in');
    }
  }

  createRipple(event) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
    `;

    // Ensure button has relative positioning
    if (getComputedStyle(button).position === 'static') {
      button.style.position = 'relative';
    }
    
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  // Utility methods
  pause() {
    this.observers.forEach(observer => observer.disconnect());
  }

  resume() {
    this.setupIntersectionObserver();
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.animatedElements.clear();
  }
}

// CSS for ripple animation
const rippleCSS = `
@keyframes ripple {
  to {
    transform: scale(2);
    opacity: 0;
  }
}
`;

// Inject ripple CSS
if (!document.querySelector('#ripple-styles')) {
  const style = document.createElement('style');
  style.id = 'ripple-styles';
  style.textContent = rippleCSS;
  document.head.appendChild(style);
}

// Initialize animation system
let animationSystem;

// Auto-initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    animationSystem = new AnimationSystem();
  });
} else {
  animationSystem = new AnimationSystem();
}

// Export for manual control
window.AnimationSystem = AnimationSystem;
window.animationSystem = animationSystem;

// Performance monitoring
if (window.performance && window.performance.mark) {
  window.performance.mark('animation-system-loaded');
}
