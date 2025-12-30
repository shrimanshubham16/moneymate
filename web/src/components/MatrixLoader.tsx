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
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Matrix characters (Katakana, numbers, symbols)
    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789@#$%^&*()_+-=[]{}|;:,.<>?";
    const charArray = chars.split("");

    // Column properties
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = [];

    // Initialize drops
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    // Draw function
    const draw = () => {
      // Semi-transparent black background for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Green text
      ctx.fillStyle = "#00ff41"; // Matrix green
      ctx.font = `${fontSize}px monospace`;

      // Draw characters
      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Draw character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down
        drops[i]++;
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
        <div className="matrix-message">{message}</div>
        <div className="matrix-subtitle">FinFlow</div>
      </div>
    </div>
  );
}


