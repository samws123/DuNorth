// Interactive CTA button component with full animation system
import React, { useEffect, useRef } from 'react';

export default function CtaButton({ 
  text = "Get Anara free", 
  target = "/chat", 
  className = "",
  style = {},
  variant = "primary" // primary, secondary
}) {
  const buttonRef = useRef(null);
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || isReducedMotion) return;

    // Add animation classes
    button.classList.add('animate-scale-hover', 'animate-colors', 'animate-focus');
    
    if (variant === 'primary') {
      button.classList.add('btn-primary');
    }

    // Enhanced click handler with spring animation
    const handleClick = (e) => {
      e.preventDefault();
      
      // Create ripple effect
      createRipple(e);
      
      // Spring animation sequence
      if (!isReducedMotion) {
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
      
      // Navigate after animation
      setTimeout(() => {
        window.location.href = target;
      }, isReducedMotion ? 0 : 350);
    };

    // Enhanced hover effects
    const handleMouseEnter = () => {
      if (isReducedMotion) return;
      button.style.transform = 'scale(1.02) translateY(-1px)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    };

    const handleMouseLeave = () => {
      if (isReducedMotion) return;
      button.style.transform = '';
      button.style.boxShadow = '';
    };

    // Add event listeners
    button.addEventListener('click', handleClick);
    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      button.removeEventListener('click', handleClick);
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [target, variant, isReducedMotion]);

  // Create ripple effect
  const createRipple = (event) => {
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
      animation: ripple 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      z-index: 1;
    `;

    // Ensure button has relative positioning and overflow hidden
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    
    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  };

  return (
    <button 
      ref={buttonRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...style
      }}
      aria-busy="false"
    >
      <span className="truncate" style={{ position: 'relative', zIndex: 2 }}>
        {text}
      </span>
    </button>
  );
}
