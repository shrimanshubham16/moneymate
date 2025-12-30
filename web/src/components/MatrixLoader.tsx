import { useEffect, useRef } from "react";
import "./MatrixLoader.css";

interface MatrixLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function MatrixLoader({ message = "Loading...", fullScreen = true }: MatrixLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      if (fullScreen) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      } else {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
        }
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Matrix characters (Katakana, numbers, symbols, plus financial symbols)
    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789$₹€£¥%+−×÷=♦◆●○◎★☆";
    const charArray = chars.split("");

    // Column properties
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = [];
    const colors: string[] = [];
    const speeds: number[] = [];

    // Psychedelic color palette
    const colorPalette = [
      "#00ff41", // Matrix green
      "#00d4ff", // Cyan
      "#ff00ff", // Magenta
      "#00ff88", // Bright green
      "#ffaa00", // Orange
      "#ff4488", // Pink
      "#44ff88", // Mint
      "#8844ff", // Purple
    ];

    // Initialize drops with varied properties
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
      colors[i] = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      speeds[i] = 0.5 + Math.random() * 1.5; // Variable speeds
    }

    let hueShift = 0;

    // Draw function
    const draw = () => {
      // Semi-transparent black background for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;
      hueShift = (hueShift + 0.5) % 360;

      // Draw characters
      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Create gradient effect based on position
        const y = drops[i] * fontSize;
        const gradientIntensity = Math.sin((y / canvas.height) * Math.PI);
        
        // Shift color over time for psychedelic effect
        if (Math.random() > 0.98) {
          colors[i] = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        }
        
        // Draw with glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = colors[i];
        
        // Brighter leading character
        if (drops[i] > 0) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(text, i * fontSize, y);
          
          // Trail characters
          ctx.fillStyle = colors[i];
          ctx.globalAlpha = 0.8 + gradientIntensity * 0.2;
        }
        
        ctx.fillText(text, i * fontSize, y);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Reset drop to top randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
          colors[i] = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        }

        // Move drop down with variable speed
        drops[i] += speeds[i];
      }
    };

    // Animation loop
    const interval = setInterval(draw, 35);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [fullScreen]);

  return (
    <div className={`matrix-loader ${fullScreen ? "fullscreen" : ""}`}>
      <canvas ref={canvasRef} className="matrix-canvas" />
      <div className="matrix-overlay">
        <div className="matrix-spinner">
          <div className="spinner-ring spinner-ring-1"></div>
          <div className="spinner-ring spinner-ring-2"></div>
          <div className="spinner-ring spinner-ring-3"></div>
          <div className="spinner-core"></div>
        </div>
        <div className="matrix-message">{message}</div>
        <div className="matrix-dots">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
