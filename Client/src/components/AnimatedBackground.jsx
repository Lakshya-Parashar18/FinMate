import React, { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function AnimatedBackground() {
  const prefersReducedMotion = useReducedMotion();
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    // Config parameters
    const particleCount = prefersReducedMotion ? 85 : 440;
    const connectionDistance = 80;
    const mouseConnectionDistance = 160;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);

      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      initParticles();
    };

    class Particle {
      constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        // Calming, slow drift speed
        const angle = Math.random() * Math.PI * 2;
        const speed = prefersReducedMotion ? 0.05 : (0.15 + Math.random() * 0.25);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = 1 + Math.random() * 1.5;
        this.alpha = 0.15 + Math.random() * 0.45;
        // Assign color (80% mint green, 20% indigo)
        this.color = Math.random() > 0.2
          ? { r: 52, g: 211, b: 153 } // #34d399
          : { r: 99, g: 102, b: 241 }; // #6366f1
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around screen edges
        if (this.x < 0) this.x = window.innerWidth;
        if (this.x > window.innerWidth) this.x = 0;
        if (this.y < 0) this.y = window.innerHeight;
        if (this.y > window.innerHeight) this.y = 0;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Connect to mouse
        if (mouseRef.current.active && mouseRef.current.x !== null) {
          const dx = p1.x - mouseRef.current.x;
          const dy = p1.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < mouseConnectionDistance) {
            const alpha = (1 - dist / mouseConnectionDistance) * 0.38;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            // Draw gradient line from particle color to subtle glow
            ctx.strokeStyle = `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${alpha})`;
            ctx.lineWidth = 1.1;
            ctx.stroke();
          }
        }

        // Connect to other particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.28;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${p1.color.r}, ${p1.color.g}, ${p1.color.b}, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw all connections
      drawConnections();

      // Update and draw particles
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    const getZoom = () => parseFloat(getComputedStyle(document.documentElement).zoom) || 1;

    const handleMouseMove = (e) => {
      const canvasEl = canvasRef.current;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        const z = getZoom();
        mouseRef.current.x = (e.clientX - rect.left) / z;
        mouseRef.current.y = (e.clientY - rect.top) / z;
        mouseRef.current.active = true;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    // Initialize
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    handleResize();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="auth-ambient-bg">
      {/* Interactive Node Graph Canvas Layer */}
      <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />

      {/* Subtle Grid Pattern Overlay */}
      <div className="auth-grid-pattern" />

      {/* Faint Dotted Noise Texture Overlay */}
      <div className="auth-noise-texture" />

      {/* Soft Vignette Overlay around edges */}
      <div className="auth-vignette" />
    </div>
  );
}
