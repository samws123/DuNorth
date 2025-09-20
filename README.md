# StudyHackz - Anara.com Clone with Motion Animations

A pixel-perfect recreation of anara.com with advanced motion animations and React hydration system.

## 🎬 Animation System

### Features Implemented
- **Exact Anara.com Motion Patterns**: Fade-in, slide-up, blur-to-clear transitions
- **Spring Physics**: CSS linear() easing functions for natural motion
- **Staggered Reveals**: Hero section animates in sequence (300ms + 100ms intervals)
- **Interactive Elements**: Button hover effects, ripple clicks, dropdown animations
- **Accessibility**: Full `prefers-reduced-motion` support
- **Performance**: GPU-accelerated transforms, Intersection Observer

### Animation Details
- **Page Load**: `opacity: 0` → `1`, `blur: 8px` → `0`, `translateY: 80px` → `0`
- **Button Hover**: `scale: 1.02`, enhanced shadows, spring transitions
- **Images**: `blur: 2px` → `0` with fade-in
- **Scroll Reveals**: Section headers and feature cards animate on scroll
- **Spring Curves**: Generated with bounce: 0.15-0.25, duration: 0.4-0.6s

## 🚀 Hydrate-in-Place Architecture

Uses a novel approach to add React interactivity without changing HTML structure:

1. **Static HTML First**: Perfect styling and SEO
2. **Selective Hydration**: Only interactive elements become React components
3. **Zero Pixel Drift**: Exact visual preservation
4. **Progressive Enhancement**: Works without JavaScript

## 📁 Project Structure

```
/anara/index.html          # Main HTML with animation classes
/css/animations.css        # Complete animation system
/js/animations.js          # Intersection Observer & interactions
/js/components/CtaButton.js # Enhanced React button component
/js/hydration.js           # Hydration registry system
```

## 🎯 Key Technologies

- **HTML/CSS**: Static site with perfect styling
- **React Hydration**: Selective component enhancement  
- **Spring Physics**: CSS linear() easing functions
- **Intersection Observer**: Scroll-triggered animations
- **Accessibility**: Reduced motion support
- **Performance**: GPU acceleration, efficient observers

## 🔧 Animation Classes

```css
.animate-fade-in          # Hero section elements
.animate-image-blur       # Image transitions
.animate-scale-hover      # Button interactions
.reveal-on-scroll         # Scroll-triggered content
.stagger-1 to .stagger-5  # Sequential timing
```

## 📱 Responsive & Accessible

- Mobile-first responsive design
- Screen reader compatible
- Keyboard navigation support
- Reduced motion preferences honored
- High contrast support

---

*Built with precision to match anara.com's premium motion design while adding React interactivity.*