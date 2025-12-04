// File: components/feedback/HandSkeletonOverlay.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useHandTracking } from '../../hooks/useHandTracking';

interface HandSkeletonOverlayProps {
  webcamRef: React.RefObject<any>;
}

export const HandSkeletonOverlay = ({ webcamRef }: HandSkeletonOverlayProps) => {
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [handRect, setHandRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const getVideoElement = () => {
    if (!webcamRef.current?.getVideoElement) return null;
    return webcamRef.current.getVideoElement();
  };

  const videoElement = getVideoElement();
  const handData = useHandTracking(videoElement);

  useEffect(() => {
    if (handData.landmarks) {
      setLandmarks(handData.landmarks);
      if (handData.handRect) {
        setHandRect(handData.handRect);
      }
    }
  }, [handData.landmarks, handData.handRect]);

  if (!videoElement || !handData.landmarks || landmarks.length === 0) {
    return null;
  }

  const videoRect = videoElement.getBoundingClientRect();
  const scaleX = videoRect.width;
  const scaleY = videoRect.height;
  const offsetX = videoRect.left;
  const offsetY = videoRect.top;

  // Define hand connections
  const CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17] // Palm connections
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Hand bounding box for debugging */}
      {handData.handDetected && handRect && (
        <motion.div
          className="absolute border-2 border-cyan-500/30 bg-cyan-500/10 rounded-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            left: offsetX + (1 - handRect.x) * scaleX - (handRect.width * scaleX),
            top: offsetY + (handRect.y * scaleY),
            width: handRect.width * scaleX,
            height: handRect.height * scaleY,
          }}
        />
      )}

      {/* Draw connections (bones) */}
      {CONNECTIONS.map(([start, end], index) => {
        const startLandmark = landmarks[start];
        const endLandmark = landmarks[end];
        
        if (!startLandmark || !endLandmark) return null;

        const startX = offsetX + ((1 - startLandmark.x) * scaleX);
        const startY = offsetY + (startLandmark.y * scaleY);
        const endX = offsetX + ((1 - endLandmark.x) * scaleX);
        const endY = offsetY + (endLandmark.y * scaleY);

        // Calculate line length and angle
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

        return (
          <motion.div
            key={`bone-${index}`}
            className="absolute bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.01 }}
            style={{
              left: startX,
              top: startY,
              width: `${length}px`,
              height: '3px',
              transform: `rotate(${angle}deg)`,
              transformOrigin: '0 0',
              boxShadow: '0 0 8px rgba(6, 182, 212, 0.8)'
            }}
          />
        );
      })}

      {/* Draw landmarks */}
      {landmarks.map((landmark, index) => {
        const x = offsetX + ((1 - landmark.x) * scaleX);
        const y = offsetY + (landmark.y * scaleY);
        
        let size = 6;
        let color = '#3b82f6';
        
        // Highlight important landmarks
        if (index === 8) { // Index tip
          size = handData.isDrawing ? 12 : 10;
          color = handData.isDrawing ? '#00ff00' : '#10b981';
        } else if (index === 4) { // Thumb tip
          size = handData.isPinching ? 10 : 8;
          color = handData.isPinching ? '#ffff00' : '#f59e0b';
        } else if ([0, 5, 9, 13, 17].includes(index)) { // Palm points
          size = 7;
          color = '#8b5cf6';
        }

        return (
          <motion.div
            key={`landmark-${index}`}
            className="absolute rounded-full border-2 border-white shadow-lg"
            initial={{ scale: 0 }}
            animate={{ 
              x: x - size/2,
              y: y - size/2,
              scale: 1 
            }}
            transition={{ 
              type: "spring",
              stiffness: 1000,
              damping: 30,
              mass: 0.5
            }}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}`
            }}
          >
            {/* Landmark number for debugging */}
            {handData.isPinching && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-white bg-black/70 px-1 rounded">
                {index}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Gesture indicator */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg shadow-xl z-60">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            handData.isDrawing ? 'bg-green-500' :
            handData.isErasing ? 'bg-red-500' :
            handData.isPinching ? 'bg-yellow-500' :
            'bg-cyan-500'
          }`} />
          <span className="text-sm font-bold">
            {handData.isDrawing ? '✏️ DRAWING' :
             handData.isErasing ? '🧹 ERASING' :
             handData.isPinching ? '🔧 PINCHING' :
             handData.handDetected ? '🖐️ HAND DETECTED' : '❌ NO HAND'}
          </span>
          <span className="text-xs opacity-75 ml-2">
            Conf: {(handData.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
};