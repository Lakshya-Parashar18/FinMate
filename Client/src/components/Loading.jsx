import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import animationData from '../assets/loading.json';
import './Loading.css';

const Loading = ({ message = "Loading" }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
    });

    return () => {
      anim.destroy();
    };
  }, []);

  return (
    <div className="loading-container">
      <div ref={containerRef} className="lottie-animation-container" />
      <p className="loading-text">
        {message}
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </p>
    </div>
  );
};

export default Loading;
