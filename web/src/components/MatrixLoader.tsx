import { useEffect, useRef, useCallback } from "react";
import "./MatrixLoader.css";

interface MatrixLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function MatrixLoader({ message = "Loading...", fullScreen = true }: MatrixLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const time = Date.now() * 0.001;

    // Clear with slight trail for smoothness
    ctx.fillStyle = "rgba(5, 5, 15, 0.15)";
    ctx.fillRect(0, 0, width, height);

    // ============ LAYER 1: Swirling Vortex Background ============
    const vortexArms = 6;
    const vortexPoints = 150;
    
    for (let arm = 0; arm < vortexArms; arm++) {
      const armOffset = (arm / vortexArms) * Math.PI * 2;
      
      for (let i = 0; i < vortexPoints; i++) {
        const t = i / vortexPoints;
        const radius = t * Math.min(width, height) * 0.7;
        const angle = armOffset + t * 8 + time * (1 + arm * 0.2);
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Rainbow color based on position and time
        const hue = (arm * 60 + t * 180 + time * 50) % 360;
        const saturation = 100;
        const lightness = 50 + Math.sin(t * Math.PI) * 20;
        const alpha = (1 - t) * 0.8;
        
        ctx.beginPath();
        ctx.arc(x, y, 3 + t * 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.fill();
      }
    }

    // ============ LAYER 2: Sacred Geometry Mandala ============
    const mandalaLayers = 5;
    const petalsPerLayer = [12, 8, 6, 16, 24];
    const layerRadii = [80, 120, 160, 200, 250];
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    for (let layer = 0; layer < mandalaLayers; layer++) {
      const petals = petalsPerLayer[layer];
      const radius = layerRadii[layer];
      const rotation = time * (layer % 2 === 0 ? 0.5 : -0.3) * (1 + layer * 0.1);
      
      ctx.save();
      ctx.rotate(rotation);
      
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2;
        const petalLength = radius * 0.4;
        const petalWidth = radius * 0.15;
        
        ctx.save();
        ctx.rotate(angle);
        ctx.translate(radius * 0.6, 0);
        
        // Petal shape
        const hue = (layer * 50 + i * (360 / petals) + time * 30) % 360;
        const gradient = ctx.createLinearGradient(-petalLength/2, 0, petalLength/2, 0);
        gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0)`);
        gradient.addColorStop(0.5, `hsla(${hue}, 100%, 60%, 0.8)`);
        gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 100%, 60%, 0)`);
        
        ctx.beginPath();
        ctx.ellipse(0, 0, petalLength, petalWidth, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Inner glow
        ctx.beginPath();
        ctx.ellipse(0, 0, petalLength * 0.6, petalWidth * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.5)`;
        ctx.fill();
        
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();

    // ============ LAYER 3: Floating Geometric Shapes ============
    const shapes = 20;
    for (let i = 0; i < shapes; i++) {
      const shapeTime = time + i * 1.5;
      const orbitRadius = 100 + (i % 5) * 60;
      const orbitSpeed = 0.3 + (i % 3) * 0.2;
      const verticalOscillation = Math.sin(shapeTime * 2) * 30;
      
      const x = centerX + Math.cos(shapeTime * orbitSpeed) * orbitRadius;
      const y = centerY + Math.sin(shapeTime * orbitSpeed) * orbitRadius * 0.6 + verticalOscillation;
      
      const size = 15 + Math.sin(shapeTime * 3) * 5;
      const hue = (i * 36 + time * 40) % 360;
      const alpha = 0.6 + Math.sin(shapeTime * 2) * 0.3;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(shapeTime * 2);
      
      // Draw different shapes
      ctx.beginPath();
      const shapeType = i % 4;
      
      if (shapeType === 0) {
        // Triangle
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.866, size * 0.5);
        ctx.lineTo(-size * 0.866, size * 0.5);
        ctx.closePath();
      } else if (shapeType === 1) {
        // Diamond
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
      } else if (shapeType === 2) {
        // Pentagon
        for (let j = 0; j < 5; j++) {
          const angle = (j / 5) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(angle) * size;
          const py = Math.sin(angle) * size;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        // Star
        for (let j = 0; j < 10; j++) {
          const angle = (j / 10) * Math.PI * 2 - Math.PI / 2;
          const r = j % 2 === 0 ? size : size * 0.5;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }
      
      ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
      ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      
      ctx.restore();
    }

    // ============ LAYER 4: Pulsing Rings ============
    const ringCount = 6;
    for (let i = 0; i < ringCount; i++) {
      const pulse = Math.sin(time * 2 + i * 0.5) * 0.3 + 0.7;
      const radius = (50 + i * 45) * pulse;
      const hue = (i * 60 + time * 60) % 360;
      const alpha = 0.4 - i * 0.05;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
      ctx.lineWidth = 3 - i * 0.3;
      ctx.stroke();
      
      // Add dashed ring
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${(hue + 180) % 360}, 100%, 70%, ${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ============ LAYER 5: Particle Burst ============
    const particles = 60;
    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2;
      const baseRadius = 30;
      const radiusVariation = Math.sin(time * 3 + i * 0.2) * 20;
      const radius = baseRadius + radiusVariation + Math.sin(time * 5 + i) * 10;
      
      const x = centerX + Math.cos(angle + time * 0.5) * radius;
      const y = centerY + Math.sin(angle + time * 0.5) * radius;
      
      const particleSize = 2 + Math.sin(time * 4 + i) * 1;
      const hue = (i * 6 + time * 100) % 360;
      
      ctx.beginPath();
      ctx.arc(x, y, particleSize, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.9)`;
      ctx.fill();
    }

    // ============ LAYER 6: Center Eye/Portal ============
    // Outer glow
    const eyeGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 80);
    const eyeHue = (time * 30) % 360;
    eyeGradient.addColorStop(0, `hsla(${eyeHue}, 100%, 80%, 1)`);
    eyeGradient.addColorStop(0.3, `hsla(${(eyeHue + 60) % 360}, 100%, 50%, 0.8)`);
    eyeGradient.addColorStop(0.6, `hsla(${(eyeHue + 120) % 360}, 100%, 40%, 0.4)`);
    eyeGradient.addColorStop(1, "transparent");
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
    ctx.fillStyle = eyeGradient;
    ctx.fill();
    
    // Inner core with multiple eyes effect (inspired by reference image)
    const eyeRows = 5;
    const eyeScale = 0.8 + Math.sin(time * 2) * 0.1;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(eyeScale, eyeScale);
    
    for (let row = 0; row < eyeRows; row++) {
      const eyesInRow = row === 0 ? 1 : row === 1 ? 2 : row === 2 ? 3 : row === 3 ? 4 : 3;
      const yOffset = (row - 2) * 12;
      
      for (let col = 0; col < eyesInRow; col++) {
        const xOffset = (col - (eyesInRow - 1) / 2) * 14;
        const eyeX = xOffset;
        const eyeY = yOffset;
        
        // Eye white
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, 6, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
        ctx.fill();
        
        // Iris
        const irisHue = (row * 60 + col * 30 + time * 50) % 360;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${irisHue}, 100%, 50%)`;
        ctx.fill();
        
        // Pupil
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();
        
        // Highlight
        ctx.beginPath();
        ctx.arc(eyeX - 1, eyeY - 1, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();
      }
    }
    ctx.restore();

    animationRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    // Start animation
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [fullScreen, draw]);

  return (
    <div className={`matrix-loader ${fullScreen ? "fullscreen" : ""}`}>
      <canvas ref={canvasRef} className="matrix-canvas" />
      <div className="psychedelic-overlay">
        <div className="cosmic-frame">
          <div className="frame-corner top-left"></div>
          <div className="frame-corner top-right"></div>
          <div className="frame-corner bottom-left"></div>
          <div className="frame-corner bottom-right"></div>
        </div>
        <div className="loader-content">
          <div className="lotus-container">
            <svg className="lotus-svg" viewBox="0 0 100 100">
              {/* Lotus petals */}
              {[...Array(12)].map((_, i) => (
                <path
                  key={i}
                  className="lotus-petal"
                  d={`M50,50 Q${50 + Math.cos((i / 12) * Math.PI * 2) * 30},${50 + Math.sin((i / 12) * Math.PI * 2) * 30} ${50 + Math.cos((i / 12) * Math.PI * 2) * 45},${50 + Math.sin((i / 12) * Math.PI * 2) * 45}`}
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    stroke: `hsl(${i * 30}, 100%, 60%)` 
                  }}
                />
              ))}
              {/* Inner petals */}
              {[...Array(8)].map((_, i) => (
                <ellipse
                  key={`inner-${i}`}
                  className="lotus-inner-petal"
                  cx="50"
                  cy="50"
                  rx="8"
                  ry="20"
                  style={{ 
                    transform: `rotate(${i * 45}deg)`,
                    transformOrigin: '50px 50px',
                    animationDelay: `${i * 0.15}s`,
                    fill: `hsla(${i * 45 + 180}, 100%, 60%, 0.6)` 
                  }}
                />
              ))}
              {/* Center gem */}
              <circle className="lotus-center" cx="50" cy="50" r="8" />
              <circle className="lotus-center-inner" cx="50" cy="50" r="4" />
            </svg>
          </div>
          <div className="message-container">
            <span className="psychedelic-message">{message}</span>
            <div className="energy-dots">
              {[...Array(7)].map((_, i) => (
                <span 
                  key={i} 
                  className="energy-dot"
                  style={{ animationDelay: `${i * 0.1}s` }}
                ></span>
              ))}
            </div>
          </div>
        </div>
        <div className="floating-symbols">
          <span className="symbol" style={{ '--delay': '0s', '--x': '10%', '--y': '20%' } as React.CSSProperties}>◇</span>
          <span className="symbol" style={{ '--delay': '0.5s', '--x': '85%', '--y': '15%' } as React.CSSProperties}>✧</span>
          <span className="symbol" style={{ '--delay': '1s', '--x': '15%', '--y': '75%' } as React.CSSProperties}>☆</span>
          <span className="symbol" style={{ '--delay': '1.5s', '--x': '80%', '--y': '80%' } as React.CSSProperties}>◎</span>
          <span className="symbol" style={{ '--delay': '2s', '--x': '50%', '--y': '10%' } as React.CSSProperties}>✦</span>
          <span className="symbol" style={{ '--delay': '2.5s', '--x': '5%', '--y': '50%' } as React.CSSProperties}>⬡</span>
          <span className="symbol" style={{ '--delay': '3s', '--x': '92%', '--y': '45%' } as React.CSSProperties}>◈</span>
        </div>
      </div>
    </div>
  );
}
