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
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    // Clear canvas completely each frame for smooth animation
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    // ============ SWIRLING VORTEX TUNNEL ============
    // This creates the hypnotic spiral tunnel effect from image 1
    const spiralLayers = 80;
    const rotationSpeed = time * 0.8;
    
    for (let i = spiralLayers; i >= 0; i--) {
      const t = i / spiralLayers;
      const radius = t * maxRadius * 1.2;
      const twist = t * 12 + rotationSpeed;
      const segments = 6;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(twist);
      
      for (let seg = 0; seg < segments; seg++) {
        const segAngle = (seg / segments) * Math.PI * 2;
        const nextAngle = ((seg + 1) / segments) * Math.PI * 2;
        
        // Rainbow colors that shift based on depth and time
        const hue = (seg * 60 + i * 4 + time * 60) % 360;
        const saturation = 100;
        const lightness = 50 + Math.sin(t * Math.PI) * 20;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, segAngle, nextAngle);
        ctx.closePath();
        
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.fill();
      }
      
      ctx.restore();
    }

    // ============ INNER VORTEX RINGS ============
    // Concentric rings that create depth perception
    for (let ring = 0; ring < 15; ring++) {
      const ringT = ring / 15;
      const ringRadius = 50 + ring * 25;
      const ringRotation = time * (ring % 2 === 0 ? 1 : -1) * 0.5;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(ringRotation);
      
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${(ring * 25 + time * 40) % 360}, 100%, 60%, ${0.3 + ringT * 0.4})`;
      ctx.lineWidth = 2 + ring * 0.5;
      ctx.stroke();
      
      ctx.restore();
    }

    // ============ COSMIC ENTITY / MEDITATION FIGURE ============
    // Central figure inspired by the multi-armed deity
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // Body glow
    const bodyGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 100);
    bodyGradient.addColorStop(0, `hsla(${(time * 30) % 360}, 100%, 70%, 0.9)`);
    bodyGradient.addColorStop(0.5, `hsla(${(time * 30 + 60) % 360}, 100%, 50%, 0.6)`);
    bodyGradient.addColorStop(1, "transparent");
    
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.fillStyle = bodyGradient;
    ctx.fill();
    
    // Head (with third eye)
    const headY = -45;
    const headSize = 35;
    
    // Head shape - grey/purple like reference
    ctx.beginPath();
    ctx.ellipse(0, headY, headSize, headSize * 1.1, 0, 0, Math.PI * 2);
    const headGrad = ctx.createLinearGradient(0, headY - headSize, 0, headY + headSize);
    headGrad.addColorStop(0, "#8b7aa8");
    headGrad.addColorStop(1, "#5a4a6a");
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Crown/headdress
    ctx.beginPath();
    ctx.moveTo(-20, headY - 30);
    ctx.quadraticCurveTo(0, headY - 60, 20, headY - 30);
    ctx.fillStyle = "#ffaa00";
    ctx.fill();
    ctx.strokeStyle = "#ff6600";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Third eye gem
    ctx.beginPath();
    ctx.ellipse(0, headY - 35, 8, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${(time * 60) % 360}, 100%, 60%)`;
    ctx.fill();
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Multiple eyes on face (like reference image 3)
    const eyeRows = [
      { y: headY - 15, count: 3, size: 5 },
      { y: headY - 5, count: 4, size: 4 },
      { y: headY + 5, count: 5, size: 4 },
      { y: headY + 15, count: 4, size: 3 },
    ];
    
    eyeRows.forEach((row, rowIdx) => {
      for (let i = 0; i < row.count; i++) {
        const eyeX = (i - (row.count - 1) / 2) * (row.size * 3);
        const eyeY = row.y;
        
        // Eye white
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, row.size * 1.5, row.size, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        
        // Iris - rainbow cycling
        const irisHue = (rowIdx * 60 + i * 30 + time * 100) % 360;
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, row.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${irisHue}, 100%, 50%)`;
        ctx.fill();
        
        // Pupil
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, row.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "#000";
        ctx.fill();
      }
    });
    
    // Body/robe
    ctx.beginPath();
    ctx.moveTo(-40, headY + 35);
    ctx.quadraticCurveTo(-50, headY + 80, -30, headY + 120);
    ctx.lineTo(30, headY + 120);
    ctx.quadraticCurveTo(50, headY + 80, 40, headY + 35);
    ctx.closePath();
    const robeGrad = ctx.createLinearGradient(0, headY + 35, 0, headY + 120);
    robeGrad.addColorStop(0, "#ffaa00");
    robeGrad.addColorStop(1, "#ff6600");
    ctx.fillStyle = robeGrad;
    ctx.fill();
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // ============ MULTIPLE ARMS ============
    // 8 arms like the deity reference
    const armCount = 8;
    const armConfigs = [
      { angle: -150, length: 90, wave: 0.3 },
      { angle: -120, length: 100, wave: 0.4 },
      { angle: -60, length: 100, wave: 0.4 },
      { angle: -30, length: 90, wave: 0.3 },
      { angle: 30, length: 90, wave: 0.3 },
      { angle: 60, length: 100, wave: 0.4 },
      { angle: 120, length: 100, wave: 0.4 },
      { angle: 150, length: 90, wave: 0.3 },
    ];
    
    armConfigs.forEach((arm, idx) => {
      const baseAngle = (arm.angle * Math.PI) / 180;
      const waveOffset = Math.sin(time * 2 + idx) * arm.wave;
      const angle = baseAngle + waveOffset;
      
      const shoulderX = Math.cos(baseAngle) * 35;
      const shoulderY = headY + 50 + Math.sin(baseAngle) * 10;
      
      const elbowX = shoulderX + Math.cos(angle) * (arm.length * 0.5);
      const elbowY = shoulderY + Math.sin(angle) * (arm.length * 0.5);
      
      const handX = elbowX + Math.cos(angle + waveOffset * 0.5) * (arm.length * 0.5);
      const handY = elbowY + Math.sin(angle + waveOffset * 0.5) * (arm.length * 0.5);
      
      // Arm
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.quadraticCurveTo(elbowX, elbowY, handX, handY);
      ctx.strokeStyle = "#7a6a8a";
      ctx.lineWidth = 12;
      ctx.lineCap = "round";
      ctx.stroke();
      
      // Bracelet
      ctx.beginPath();
      ctx.arc(elbowX, elbowY, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffaa00";
      ctx.fill();
      
      // Hand (simplified palm)
      ctx.beginPath();
      ctx.arc(handX, handY, 12, 0, Math.PI * 2);
      ctx.fillStyle = "#8a7a9a";
      ctx.fill();
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Fingers
      for (let f = 0; f < 5; f++) {
        const fingerAngle = angle - 0.4 + f * 0.2;
        const fingerLength = 8 + (f === 2 ? 4 : 0);
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(
          handX + Math.cos(fingerAngle) * fingerLength,
          handY + Math.sin(fingerAngle) * fingerLength
        );
        ctx.strokeStyle = "#8a7a9a";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });
    
    ctx.restore();

    // ============ FLOATING UFOs ============
    // Like in reference image 3
    const ufoPositions = [
      { x: -200, y: -150, size: 40 },
      { x: 200, y: -150, size: 40 },
    ];
    
    ufoPositions.forEach((ufo, idx) => {
      const bobY = Math.sin(time * 2 + idx) * 10;
      const ux = centerX + ufo.x;
      const uy = centerY + ufo.y + bobY;
      
      ctx.save();
      ctx.translate(ux, uy);
      ctx.rotate(Math.sin(time + idx) * 0.1);
      
      // UFO dome
      ctx.beginPath();
      ctx.ellipse(0, -10, ufo.size * 0.5, ufo.size * 0.4, 0, Math.PI, 0);
      const domeGrad = ctx.createLinearGradient(0, -25, 0, -10);
      domeGrad.addColorStop(0, "#aa88cc");
      domeGrad.addColorStop(1, "#7755aa");
      ctx.fillStyle = domeGrad;
      ctx.fill();
      ctx.strokeStyle = "#ff88ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // UFO body
      ctx.beginPath();
      ctx.ellipse(0, 0, ufo.size, ufo.size * 0.25, 0, 0, Math.PI * 2);
      const bodyGrad = ctx.createLinearGradient(0, -10, 0, 10);
      bodyGrad.addColorStop(0, "#88ddaa");
      bodyGrad.addColorStop(0.5, "#55aa77");
      bodyGrad.addColorStop(1, "#ff88aa");
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.strokeStyle = "#ffaacc";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // UFO lights
      for (let l = 0; l < 5; l++) {
        const lx = (l - 2) * (ufo.size * 0.35);
        ctx.beginPath();
        ctx.arc(lx, 5, 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${(l * 60 + time * 100) % 360}, 100%, 70%)`;
        ctx.fill();
      }
      
      // Beam
      ctx.beginPath();
      ctx.moveTo(-15, 10);
      ctx.lineTo(-30, 80);
      ctx.lineTo(30, 80);
      ctx.lineTo(15, 10);
      ctx.closePath();
      ctx.fillStyle = `hsla(${(time * 60) % 360}, 100%, 70%, 0.2)`;
      ctx.fill();
      
      ctx.restore();
    });

    // ============ FLOATING COSMIC ELEMENTS ============
    // Stars, planets, sparkles
    const cosmicElements = 30;
    for (let i = 0; i < cosmicElements; i++) {
      const angle = (i / cosmicElements) * Math.PI * 2 + time * 0.2;
      const radius = 200 + Math.sin(i * 1.5 + time) * 80;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.7;
      const size = 3 + Math.sin(i + time * 3) * 2;
      const hue = (i * 12 + time * 30) % 360;
      
      // Star shape
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(time * 2 + i);
      
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const starAngle = (p / 8) * Math.PI * 2;
        const starRadius = p % 2 === 0 ? size : size * 0.4;
        const sx = Math.cos(starAngle) * starRadius;
        const sy = Math.sin(starAngle) * starRadius;
        if (p === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
      ctx.fill();
      
      ctx.restore();
    }

    // ============ GLOWING ORB AT CENTER ============
    const orbPulse = Math.sin(time * 3) * 0.2 + 1;
    const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40 * orbPulse);
    orbGradient.addColorStop(0, "#ffffff");
    orbGradient.addColorStop(0.3, `hsla(${(time * 60) % 360}, 100%, 70%, 0.8)`);
    orbGradient.addColorStop(0.7, `hsla(${(time * 60 + 120) % 360}, 100%, 50%, 0.4)`);
    orbGradient.addColorStop(1, "transparent");
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40 * orbPulse, 0, Math.PI * 2);
    ctx.fillStyle = orbGradient;
    ctx.fill();

    animationRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      if (fullScreen) {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
      } else {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth * dpr;
          canvas.height = parent.clientHeight * dpr;
          canvas.style.width = parent.clientWidth + "px";
          canvas.style.height = parent.clientHeight + "px";
        }
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [fullScreen, draw]);

  return (
    <div className={`matrix-loader ${fullScreen ? "fullscreen" : ""}`}>
      <canvas ref={canvasRef} className="matrix-canvas" />
      <div className="loader-message-overlay">
        <div className="message-box">
          <span className="loading-text">{message}</span>
          <div className="loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
