import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useHandTracking } from "../../hooks/useHandTracking";
import { Minimize2, Maximize2, Hand } from "lucide-react";

// In DrawingCanvas.jsx, update the component to accept these props:
interface DrawingCanvasProps {
  activeTool: string;
  color: string;
  brushSize: number;
  webcamRef?: any;
  cameraReady?: boolean;
  onBrushSizeChange?: (size: number) => void;
  activeLayerId?: string;
  layers?: Array<any>;
  onCanvasUpdate?: (layerId: string, canvasData: string) => void;
}

export const DrawingCanvas = ({ 
  activeTool, 
  color, 
  brushSize, 
  webcamRef, 
  cameraReady,
  onBrushSizeChange 
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastDrawPos = useRef<{x: number, y: number} | null>(null);
  const animationFrameRef = useRef<number>(0);
  const dpr = window.devicePixelRatio || 1;
  const brushSizeRef = useRef<number>(brushSize);

  // Get video element
  const getVideoElement = useCallback(() => {
    if (!webcamRef?.current?.getVideoElement) {
      return null;
    }
    return webcamRef.current.getVideoElement();
  }, [webcamRef]);

  const videoElement = getVideoElement();

  // Use hand tracking hook
  const handData = useHandTracking({
    videoElement: cameraReady ? videoElement : null,
    canvasRef: canvasRef,
    onBrushSizeChange: onBrushSizeChange
  });

  // Update brush size ref
  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  // Handle brush size adjustment with continuous control - FIXED
  useEffect(() => {
    if (handData.brushSizeAdjustment !== 0 && onBrushSizeChange) {
      const adjustment = handData.brushSizeAdjustment * 5; // Fixed: 5px per thumb up/down
      const newSize = brushSize + adjustment;
      const clampedSize = Math.max(2, Math.min(newSize, 60));
      
      // Only update if the size actually changes
      if (clampedSize !== brushSize) {
        console.log(`Brush size adjustment: ${handData.brushSizeAdjustment > 0 ? 'INCREASE' : 'DECREASE'}, ${brushSize}px -> ${clampedSize}px`);
        onBrushSizeChange(clampedSize);
      }
    }
  }, [handData.brushSizeAdjustment, brushSize, onBrushSizeChange]);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      const rect = containerRef.current.getBoundingClientRect();
      
      // Set display size (css pixels)
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Set actual size in memory (scaled for DPR)
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalCompositeOperation = "source-over";
        contextRef.current = ctx;
      }
    }
  }, [dpr]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current && contextRef.current) {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        const rect = containerRef.current.getBoundingClientRect();
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        
        ctx.scale(dpr, dpr);
        
        if (imageData) {
          ctx.putImageData(imageData, 0, 0);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [dpr]);

  // Update cursor position from hand tracking
  useEffect(() => {
    if (handData.cursor.x > 0 && handData.cursor.y > 0) {
      setCursorPos({ 
        x: handData.cursor.x, 
        y: handData.cursor.y 
      });
    }
  }, [handData.cursor]);

  // Smoothing buffer for drawing with velocity prediction
  const drawPointsRef = useRef<{x: number, y: number, pressure: number, time: number}[]>([]);
  const SMOOTHING_BUFFER_SIZE = 15;
  const lastVelocityRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });

  // Main drawing animation loop
  useEffect(() => {
    const drawFrame = () => {
      const ctx = contextRef.current;
      if (!ctx || !canvasRef.current || !handData.handDetected) {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      const currentTime = Date.now();
      const x = handData.cursor.x;
      const y = handData.cursor.y;
      
      // Add point to smoothing buffer with timestamp
      drawPointsRef.current.push({ 
        x, 
        y, 
        pressure: handData.confidence,
        time: currentTime
      });
      
      if (drawPointsRef.current.length > SMOOTHING_BUFFER_SIZE) {
        drawPointsRef.current.shift();
      }
      
      // Calculate smoothed position with velocity prediction
      const smoothed = smoothPointsWithVelocity(drawPointsRef.current);
      
      // DRAWING GESTURE - Very smooth continuous line
      if (handData.isDrawing) {
        if (!isDrawing) {
          // Start new drawing path
          setIsDrawing(true);
          lastDrawPos.current = { x: smoothed.x, y: smoothed.y };
          drawPointsRef.current = [{ 
            x: smoothed.x, 
            y: smoothed.y, 
            pressure: handData.confidence,
            time: currentTime
          }];
          
          // Draw initial point
          ctx.beginPath();
          ctx.arc(smoothed.x, smoothed.y, brushSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          lastVelocityRef.current = { x: 0, y: 0 };
        } else if (lastDrawPos.current) {
          // Calculate velocity for prediction
          const velocity = {
            x: smoothed.x - lastDrawPos.current.x,
            y: smoothed.y - lastDrawPos.current.y
          };
          
          // Apply momentum for smoother lines
          const momentum = 0.3;
          const predictedX = smoothed.x + (velocity.x * momentum);
          const predictedY = smoothed.y + (velocity.y * momentum);
          
          // Draw smooth, continuous line with Bézier curves
          ctx.beginPath();
          ctx.moveTo(lastDrawPos.current.x, lastDrawPos.current.y);
          
          // Calculate control points for smooth curve
          const midX = (lastDrawPos.current.x + predictedX) / 2;
          const midY = (lastDrawPos.current.y + predictedY) / 2;
          
          const controlPoint1 = {
            x: (lastDrawPos.current.x + midX) / 2,
            y: (lastDrawPos.current.y + midY) / 2
          };
          
          const controlPoint2 = {
            x: (midX + predictedX) / 2,
            y: (midY + predictedY) / 2
          };
          
          ctx.bezierCurveTo(
            controlPoint1.x, controlPoint1.y,
            controlPoint2.x, controlPoint2.y,
            predictedX, predictedY
          );
          
          // Dynamic line width based on speed and confidence
          const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
          const dynamicWidth = Math.max(
            brushSize * 0.7,
            Math.min(brushSize * 1.3, brushSize * (1 - speed * 0.5 + handData.confidence * 0.3))
          );
          
          ctx.strokeStyle = color;
          ctx.lineWidth = dynamicWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
          
          // Fill the end for smooth connections
          ctx.beginPath();
          ctx.arc(predictedX, predictedY, dynamicWidth / 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          
          lastVelocityRef.current = velocity;
          lastDrawPos.current = { x: predictedX, y: predictedY };
        }
      }
      // ERASING GESTURES (both original and palm)
      else if (handData.isErasing || handData.isPalmOpen) {
        const eraseSize = handData.isPalmOpen ? brushSize * 4 : brushSize * 3;
        ctx.globalCompositeOperation = "destination-out";
        
        // Smooth eraser movement
        if (lastDrawPos.current) {
          const velocity = {
            x: smoothed.x - lastDrawPos.current.x,
            y: smoothed.y - lastDrawPos.current.y
          };
          
          // Draw multiple circles for smoother erasing
          const steps = 3;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const interpX = lastDrawPos.current.x + (smoothed.x - lastDrawPos.current.x) * t;
            const interpY = lastDrawPos.current.y + (smoothed.y - lastDrawPos.current.y) * t;
            
            ctx.beginPath();
            ctx.arc(interpX, interpY, eraseSize / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          ctx.arc(smoothed.x, smoothed.y, eraseSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.globalCompositeOperation = "source-over";
        lastDrawPos.current = { x: smoothed.x, y: smoothed.y };
      }
      // PINCH GESTURE - Clear drawing buffer without stopping
      else if (handData.isPinching && isDrawing) {
        // Just clear the buffer but keep drawing state
        drawPointsRef.current = [];
        lastVelocityRef.current = { x: 0, y: 0 };
      }
      // FIST GESTURE - Stop drawing
      else if (handData.isFist && isDrawing) {
        setIsDrawing(false);
        lastDrawPos.current = null;
        drawPointsRef.current = [];
        lastVelocityRef.current = { x: 0, y: 0 };
      }
      // NO GESTURE - Gracefully stop drawing after delay
      else if (!handData.isDrawing && isDrawing) {
        const timeSinceLastPoint = currentTime - (drawPointsRef.current[drawPointsRef.current.length - 1]?.time || currentTime);
        
        if (timeSinceLastPoint > 100) { // 100ms delay before stopping
          setIsDrawing(false);
          lastDrawPos.current = null;
          drawPointsRef.current = [];
          lastVelocityRef.current = { x: 0, y: 0 };
        }
      }

      animationFrameRef.current = requestAnimationFrame(drawFrame);
    };

    animationFrameRef.current = requestAnimationFrame(drawFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [handData, isDrawing, color, brushSize]);

  // Enhanced smoothing with velocity prediction
  const smoothPointsWithVelocity = (points: {x: number, y: number, pressure: number, time: number}[]) => {
    if (points.length < 2) return points[0] || { x: 0, y: 0 };
    
    // Calculate weighted average with exponential decay
    let totalX = 0;
    let totalY = 0;
    let totalWeight = 0;
    const decayRate = 0.85;
    
    points.forEach((point, i) => {
      const recency = Math.pow(decayRate, points.length - i - 1);
      const confidenceWeight = 0.5 + (point.pressure * 0.5);
      const weight = recency * confidenceWeight;
      
      totalX += point.x * weight;
      totalY += point.y * weight;
      totalWeight += weight;
    });
    
    const baseX = totalX / totalWeight;
    const baseY = totalY / totalWeight;
    
    // Add velocity prediction
    if (points.length >= 3) {
      const recentPoints = points.slice(-3);
      const avgVelocity = {
        x: (recentPoints[2].x - recentPoints[0].x) / (recentPoints[2].time - recentPoints[0].time) * 16.67, // Normalize to 60fps
        y: (recentPoints[2].y - recentPoints[0].y) / (recentPoints[2].time - recentPoints[0].time) * 16.67
      };
      
      return {
        x: baseX + avgVelocity.x * 0.5,
        y: baseY + avgVelocity.y * 0.5
      };
    }
    
    return { x: baseX, y: baseY };
  };

  // Mouse/touch fallback
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    setIsDrawing(true);
    setCursorPos({ x, y });
    lastDrawPos.current = { x, y };
    
    const ctx = contextRef.current;
    if (ctx) {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    
    setCursorPos({ x, y });
    
    if (isDrawing && lastDrawPos.current) {
      const ctx = contextRef.current;
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastDrawPos.current.x, lastDrawPos.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      lastDrawPos.current = { x, y };
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastDrawPos.current = null;
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
  };

  // Determine cursor appearance
  const getCursorStyle = () => {
    if (handData.isPinching) {
      return {
        width: brushSize * 2.5,
        height: brushSize * 2.5,
        borderColor: '#ffff00',
        backgroundColor: 'rgba(255, 255, 0, 0.2)',
        borderWidth: 2,
        icon: '✊',
        tooltip: 'Pinching'
      };
    }
    
    if (handData.isPalmOpen) {
      return {
        width: brushSize * 5,
        height: brushSize * 5,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 3,
        icon: '🖐️',
        tooltip: 'Palm Erase'
      };
    }
    
    if (handData.isErasing) {
      return {
        width: brushSize * 3,
        height: brushSize * 3,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 2,
        icon: '🧹',
        tooltip: 'Erasing'
      };
    }
    
    if (handData.isDrawing) {
      return {
        width: brushSize + 20,
        height: brushSize + 20,
        borderColor: color,
        backgroundColor: color + '30',
        borderWidth: 2,
        icon: '✏️',
        tooltip: 'Drawing'
      };
    }
    
    if (handData.brushSizeAdjustment > 0) {
      return {
        width: 45,
        height: 45,
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        borderWidth: 2,
        icon: '👍',
        tooltip: 'Increase Brush (5px)'
      };
    }
    
    if (handData.brushSizeAdjustment < 0) {
      return {
        width: 45,
        height: 45,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        borderWidth: 2,
        icon: '👎',
        tooltip: 'Decrease Brush (5px)'
      };
    }
    
    if (handData.isFist) {
      return {
        width: 35,
        height: 35,
        borderColor: "#ffffff",
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 2,
        icon: '✊',
        tooltip: 'Stop'
      };
    }
    
    return {
      width: 45,
      height: 45,
      borderColor: "#ffffff",
      backgroundColor: "transparent",
      borderWidth: 2,
      icon: '🖐️',
      tooltip: 'Idle'
    };
  };

  const cursorStyle = getCursorStyle();

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden cursor-none z-10">
      {/* Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ 
             backgroundImage: `
                linear-gradient(to right, #ffffff 1px, transparent 1px), 
                linear-gradient(to bottom, #ffffff 1px, transparent 1px)
             `,
             backgroundSize: '40px 40px'
           }} 
      />
      
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => {
          e.preventDefault();
          handleMouseDown(e.touches[0] as any);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          handleMouseMove(e.touches[0] as any);
        }}
        onTouchEnd={handleMouseUp}
        className="absolute inset-0 touch-none"
      />

      {/* Cursor */}
      {cursorPos.x > 0 && cursorPos.y > 0 && (
        <motion.div
          className="pointer-events-none fixed z-50 flex items-center justify-center"
          animate={{ 
            x: cursorPos.x - cursorStyle.width / 2,
            y: cursorPos.y - cursorStyle.height / 2
          }}
          transition={{ 
            type: "spring", 
            stiffness: 1800,
            damping: 30,
            mass: 0.15
          }}
          style={{
            width: cursorStyle.width,
            height: cursorStyle.height
          }}
        >
          <div 
            className="rounded-full border-2 shadow-lg"
            style={{
              borderColor: cursorStyle.borderColor,
              backgroundColor: cursorStyle.backgroundColor,
              borderWidth: cursorStyle.borderWidth,
              width: '100%',
              height: '100%',
              boxShadow: `0 0 25px ${cursorStyle.borderColor}80`
            }}
          />
          
          <div className="absolute text-white text-lg font-bold">
            {cursorStyle.icon}
          </div>
          
          {/* Tooltip */}
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-3 py-1 rounded-md text-xs whitespace-nowrap">
            {cursorStyle.tooltip}
          </div>
        </motion.div>
      )}
      
      {/* Enhanced Hand Tracking Status */}
      <div className="absolute top-4 left-4 bg-black/90 text-white text-xs p-4 rounded-xl pointer-events-none backdrop-blur-sm shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            handData.handDetected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="font-semibold">
            {handData.handDetected ? `✅ Hand Tracking Active` : '❌ No Hand Detected'}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-400">Gesture:</span>
            <span className="font-medium">
              {handData.isDrawing ? '✏️ Drawing' : 
               handData.isErasing ? (handData.isPalmOpen ? '🖐️ Palm Erase' : '🧹 Finger Erase') : 
               handData.isPinching ? '🔧 Pinching' : 
               handData.brushSizeAdjustment > 0 ? '👍 Increasing Brush' :
               handData.brushSizeAdjustment < 0 ? '👎 Decreasing Brush' :
               handData.isFist ? '✊ Fist' : '🖐️ Idle'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-400">Confidence:</span>
            <div className="flex-1">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                  style={{ width: `${(handData.confidence * 100)}%` }}
                />
              </div>
            </div>
            <span className="w-10 text-right">{(handData.confidence * 100).toFixed(0)}%</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-400">Position:</span>
            <span className="font-mono">{Math.round(cursorPos.x)}, {Math.round(cursorPos.y)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="w-24 text-gray-400">Brush Size:</span>
            <div className="flex-1">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  style={{ width: `${(brushSize / 60) * 100}%` }}
                />
              </div>
            </div>
            <span className="w-10 text-right font-bold">{brushSize}px</span>
          </div>
          
          {/* Brush Adjustment Status */}
          {handData.brushSizeAdjustment !== 0 && (
            <div className="mt-2 p-2 bg-gray-800/50 rounded">
              <div className="text-xs font-medium text-center">
                {handData.brushSizeAdjustment > 0 ? '👍 Increasing brush by 5px' : '👎 Decreasing brush by 5px'}
              </div>
            </div>
          )}
        </div>
        
        {/* Gesture Tips */}
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="text-[10px] text-gray-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>🖐️ Open Palm:</span>
              <span className="text-red-300">Erase</span>
            </div>
            <div className="flex items-center justify-between">
              <span>👍 Thumb Up:</span>
              <span className="text-green-300">+5px Brush</span>
            </div>
            <div className="flex items-center justify-between">
              <span>👎 Thumb Down:</span>
              <span className="text-red-300">-5px Brush</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="absolute top-4 right-4 flex flex-col gap-3">
        {/* Clear Canvas Button */}
        <button
          onClick={clearCanvas}
          className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg backdrop-blur-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Canvas
        </button>

        {/* Brush Size Quick Controls */}
        <div className="bg-black/80 backdrop-blur-sm rounded-xl p-3 shadow-lg">
          <div className="text-xs font-medium text-gray-300 mb-2">Quick Adjust</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBrushSizeChange?.(Math.max(2, brushSize - 5))}
              className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-lg transition-all"
              title="Decrease brush size by 5px"
            >
              <Minimize2 size={18} className="text-white" />
            </button>
            <div className="flex-1 min-w-[120px]">
              <div className="relative">
                <input
                  type="range"
                  min="2"
                  max="60"
                  value={brushSize}
                  onChange={(e) => onBrushSizeChange?.(parseInt(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>2</span>
                  <span className="text-white font-bold">{brushSize}px</span>
                  <span>60</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onBrushSizeChange?.(Math.min(60, brushSize + 5))}
              className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-lg transition-all"
              title="Increase brush size by 5px"
            >
              <Maximize2 size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Help Panel */}
      {!handData.handDetected && cameraReady ? (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-black/90 to-gray-900/90 text-white px-6 py-4 rounded-xl text-sm max-w-lg text-center pointer-events-none backdrop-blur-sm shadow-2xl">
          <div className="font-bold text-lg mb-3 flex items-center justify-center gap-2">
            <Hand className="animate-pulse" />
            Show Your Hand to Start Drawing
          </div>
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-blue-500/20 rounded">
                  <span className="text-sm">👆</span>
                </div>
                <span className="text-xs"><strong>Point</strong> to draw</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-red-500/20 rounded">
                  <span className="text-sm">🖐️</span>
                </div>
                <span className="text-xs"><strong>Open palm</strong> to erase</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-green-500/20 rounded">
                  <span className="text-sm">👍</span>
                </div>
                <span className="text-xs"><strong>Thumb up</strong> to increase brush by 5px</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 flex items-center justify-center bg-yellow-500/20 rounded">
                  <span className="text-sm">👎</span>
                </div>
                <span className="text-xs"><strong>Thumb down</strong> to decrease brush by 5px</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-xs pointer-events-none backdrop-blur-sm">
          <span className="text-gray-300">Tip:</span> Use 👍 thumb up (+5px) or 👎 thumb down (-5px) to adjust brush size
        </div>
      )}
      
      {/* Performance Indicator */}
      <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-xs backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            drawPointsRef.current.length > 10 ? 'bg-green-500' :
            drawPointsRef.current.length > 5 ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span>
            Smoothness: {
              drawPointsRef.current.length > 10 ? 'Excellent' :
              drawPointsRef.current.length > 5 ? 'Good' : 'Poor'
            }
          </span>
        </div>
      </div>
    </div>
  );
};