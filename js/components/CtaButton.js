// Interactive CTA button component
import React from 'react';

export default function CtaButton({ 
  text = "Get Anara free", 
  target = "/chat", 
  className = "",
  style = {} 
}) {
  const handleClick = (e) => {
    e.preventDefault();
    
    // Add click animation
    e.target.style.transform = 'scale(0.98)';
    setTimeout(() => {
      e.target.style.transform = '';
    }, 150);
    
    // Navigate after animation
    setTimeout(() => {
      window.location.href = target;
    }, 200);
  };

  return (
    <button 
      onClick={handleClick}
      className={className}
      style={style}
      aria-busy="false"
    >
      <span className="truncate">{text}</span>
    </button>
  );
}
