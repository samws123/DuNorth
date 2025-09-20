// Enhanced Animation Initialization for Anara.com Clone
// This script handles all the complex animation interactions and timing

(function() {
  'use strict';

  // Animation configuration
  const ANIMATION_CONFIG = {
    heroStagger: 100,        // ms between hero element animations
    heroDelay: 300,          // ms initial delay before hero animations start
    scrollThreshold: 0.1,    // Intersection observer threshold
    scrollMargin: '-100px',  // Trigger animations 100px before entering viewport
    springDuration: {
      fast: 200,
      medium: 350,
      slow: 950
    }
  };

  // Enhanced animation system with better performance
  class EnhancedAnimationSystem {
    constructor() {
      this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.animatedElements = new WeakSet();
      this.observers = [];
      this.rafId = null;
      
      this.init();
    }

    init() {
      if (this.isReducedMotion) {
        this.disableAnimations();
        return;
      }

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.setupIntersectionObserver();
      this.setupHeroAnimations();
      this.setupInteractiveElements();
      this.setupImageAnimations();
      this.setupScrollAnimations();
      this.setupPerformanceMonitoring();
    }

    disableAnimations() {
      document.body.classList.add('no-animations');
      
      // Immediately show all hidden elements
      const elements = document.querySelectorAll('.animate-fade-in, .animate-image-blur, .reveal-on-scroll');
      elements.forEach(el => {
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.transform = 'none';
      });
    }

    setupIntersectionObserver() {
      const options = {
        root: null,
        rootMargin: `0px 0px ${ANIMATION_CONFIG.scrollMargin} 0px`,
        threshold: ANIMATION_CONFIG.scrollThreshold
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.animatedElements.has(entry.target)) {
            this.animateElement(entry.target);
            this.animatedElements.add(entry.target);
          }
        });
      }, options);

      // Observe all scroll-triggered elements
      const scrollElements = document.querySelectorAll('.reveal-on-scroll, .animate-fade-in:not(.hero-element)');
      scrollElements.forEach(el => observer.observe(el));
      
      this.observers.push(observer);
    }

    setupHeroAnimations() {
      const heroElements = document.querySelectorAll('.hero-element');
      
      // Set initial states
      heroElements.forEach(el => {
        if (el.classList.contains('animate-fade-in')) {
          el.style.opacity = '0';
          el.style.filter = 'blur(8px)';
          el.style.transform = 'translateY(80px)';
        } else if (el.classList.contains('animate-image-blur')) {
          el.style.opacity = '0';
          el.style.filter = 'blur(2px)';
        }
      });

      // Trigger staggered animations
      setTimeout(() => {
        heroElements.forEach((el, index) => {
          setTimeout(() => {
            el.classList.add('animate-in');
          }, index * ANIMATION_CONFIG.heroStagger);
        });
      }, ANIMATION_CONFIG.heroDelay);
    }

    setupInteractiveElements() {
      // Enhanced button interactions
      const buttons = document.querySelectorAll('button, .btn, [role="button"]');
      buttons.forEach(button => {
        this.enhanceButton(button);
      });

      // Dropdown animations
      const dropdowns = document.querySelectorAll('[data-state]');
      dropdowns.forEach(dropdown => {
        this.enhanceDropdown(dropdown);
      });

      // FAQ/Accordion animations
      const accordions = document.querySelectorAll('[data-orientation="vertical"]');
      accordions.forEach(accordion => {
        this.enhanceAccordion(accordion);
      });
    }

    enhanceButton(button) {
      button.classList.add('animate-scale-hover', 'animate-colors', 'animate-focus');
      
      // Add enhanced hover effects
      button.addEventListener('mouseenter', () => {
        if (this.isReducedMotion) return;
        button.style.transform = 'scale(1.02) translateY(-1px)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        button.style.transition = `transform ${ANIMATION_CONFIG.springDuration.medium}ms var(--spring-bounce-light)`;
      });

      button.addEventListener('mouseleave', () => {
        if (this.isReducedMotion) return;
        button.style.transform = '';
        button.style.boxShadow = '';
      });

      // Enhanced click animation
      button.addEventListener('click', (e) => {
        if (this.isReducedMotion) return;
        this.createRipple(e);
        this.animateButtonClick(button);
      });
    }

    enhanceDropdown(dropdown) {
      const chevron = dropdown.querySelector('svg');
      if (!chevron) return;

      chevron.classList.add('animate-chevron');
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.attributeName === 'data-state') {
            const isOpen = dropdown.getAttribute('data-state') === 'open';
            chevron.classList.toggle('rotate-180', isOpen);
          }
        });
      });
      
      observer.observe(dropdown, { attributes: true });
      this.observers.push(observer);
    }

    enhanceAccordion(accordion) {
      const icons = accordion.querySelectorAll('svg');
      icons.forEach(icon => {
        icon.classList.add('animate-icon-swap');
      });
    }

    setupImageAnimations() {
      const images = document.querySelectorAll('img, [data-nimg]');
      images.forEach(img => {
        if (img.complete && img.naturalHeight !== 0) {
          img.classList.add('animate-image-blur', 'animate-in');
        } else {
          img.classList.add('animate-image-blur');
          img.addEventListener('load', () => {
            setTimeout(() => img.classList.add('animate-in'), 100);
          });
        }
      });
    }

    setupScrollAnimations() {
      // Add smooth scroll behavior
      document.documentElement.style.scrollBehavior = 'smooth';
      
      // Setup scroll progress indicator
      const progressBar = document.getElementById('scroll-progress');
      
      // Add scroll-triggered parallax effects (subtle) and progress indicator
      let ticking = false;
      
      const updateScrollEffects = () => {
        const scrolled = window.pageYOffset;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = scrolled / maxScroll;
        
        // Update progress bar
        if (progressBar) {
          progressBar.style.transform = `scaleX(${scrollProgress})`;
        }
        
        // Update parallax elements
        const parallaxElements = document.querySelectorAll('.parallax-subtle');
        parallaxElements.forEach(el => {
          const rate = scrolled * -0.5;
          el.style.transform = `translateY(${rate}px)`;
        });
        
        ticking = false;
      };

      window.addEventListener('scroll', () => {
        if (!ticking && !this.isReducedMotion) {
          this.rafId = requestAnimationFrame(updateScrollEffects);
          ticking = true;
        }
      });
    }

    setupPerformanceMonitoring() {
      // Monitor animation performance
      if (window.performance && window.performance.mark) {
        window.performance.mark('animations-initialized');
      }

      // Cleanup on page unload
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
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
      ripple.className = 'ripple-effect';
      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: none;
        z-index: 1;
      `;

      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.appendChild(ripple);

      setTimeout(() => {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 600);
    }

    animateButtonClick(button) {
      button.style.transform = 'scale(0.95)';
      button.style.transition = 'transform 100ms cubic-bezier(0.4, 0, 0.2, 1)';
      
      setTimeout(() => {
        button.style.transform = 'scale(1.02)';
        button.style.transition = 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)';
      }, 100);
      
      setTimeout(() => {
        button.style.transform = '';
        button.style.transition = '';
      }, 300);
    }

    cleanup() {
      this.observers.forEach(observer => {
        if (observer.disconnect) observer.disconnect();
      });
      
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
    }
  }

  // Initialize the enhanced animation system
  window.enhancedAnimationSystem = new EnhancedAnimationSystem();

  // Add ripple keyframes if not already present
  if (!document.querySelector('#ripple-keyframes')) {
    const style = document.createElement('style');
    style.id = 'ripple-keyframes';
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

})();
