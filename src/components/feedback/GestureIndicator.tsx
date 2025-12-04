// File: components/feedback/GestureIndicator.tsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GestureIndicatorProps {
  webcamRef?: any;
}

export const GestureIndicator = ({ webcamRef }: GestureIndicatorProps) => {
  const [handData, setHandData] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [brushSizeInfo, setBrushSizeInfo] = useState('');
  const [gestureTips, setGestureTips] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (webcamRef?.current?.getHandData) {
        const data = webcamRef.current.getHandData();
        setHandData(data);
        setVisible(data?.handDetected || false);
        
        // Update brush size info
        if (data?.brushSizeAdjustment > 0) {
          setBrushSizeInfo('Increasing brush size by 5px');
        } else if (data?.brushSizeAdjustment < 0) {
          setBrushSizeInfo('Decreasing brush size by 5px');
        } else {
          setBrushSizeInfo('');
        }
        
        // Update gesture tips
        const tips = [];
        if (data?.isPalmOpen) tips.push('🖐️ Open palm = Large erase');
        if (data?.isErasing && !data?.isPalmOpen) tips.push('✌️ Two fingers = Small erase');
        if (data?.brushSizeAdjustment > 0) tips.push('👍 Thumb up = Increase brush (+5px)');
        if (data?.brushSizeAdjustment < 0) tips.push('👎 Thumb down = Decrease brush (-5px)');
        setGestureTips(tips);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [webcamRef]);

  if (!visible || !handData?.landmarks) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Draw all 21 hand landmarks */}
      {handData.landmarks.map((landmark: any, index: number) => {
        if (!handData.cursor) return null;
        
        // Calculate screen position
        const screenX = handData.cursor.x + (landmark.x - 0.5) * 200;
        const screenY = handData.cursor.y + (landmark.y - 0.5) * 200;
        
        // Different colors for different landmark types
        let color = '#3b82f6'; // Default blue
        let size = 4;
        
        if (index === 8) { // Index finger tip
          color = handData.isDrawing ? '#00ff00' : 
                  handData.brushSizeAdjustment > 0 ? '#22c55e' : '#3b82f6';
          size = handData.isDrawing ? 8 : 
                 handData.brushSizeAdjustment > 0 ? 7 : 6;
        } else if (index === 4) { // Thumb tip
          color = handData.brushSizeAdjustment !== 0 ? '#ff9900' : '#3b82f6';
          size = handData.brushSizeAdjustment !== 0 ? 7 : 5;
        } else if ([0, 5, 9, 13, 17].includes(index)) { // Palm points
          color = handData.isPalmOpen ? '#ef4444' : '#8b5cf6';
          size = handData.isPalmOpen ? 6 : 5;
        }

        return (
          <motion.div
            key={index}
            className="absolute rounded-full"
            style={{
              left: screenX - size/2,
              top: screenY - size/2,
              width: size,
              height: size,
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`,
            }}
            animate={{
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.03,
            }}
          />
        );
      })}

      {/* Gesture status indicator */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-black/95 to-gray-900/95 text-white px-5 py-4 rounded-xl backdrop-blur-sm min-w-[250px] shadow-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-4 h-4 rounded-full animate-pulse ${
            handData.isDrawing ? 'bg-green-500' :
            handData.isErasing ? (handData.isPalmOpen ? 'bg-red-500' : 'bg-orange-500') :
            handData.isPinching ? 'bg-yellow-500' :
            handData.brushSizeAdjustment > 0 ? 'bg-green-500' :
            handData.brushSizeAdjustment < 0 ? 'bg-red-500' :
            handData.isFist ? 'bg-purple-500' : 'bg-blue-500'
          }`} />
          <span className="text-sm font-semibold">
            {handData.isDrawing ? '✏️ Drawing Mode' :
             handData.isErasing ? (handData.isPalmOpen ? '🖐️ Palm Erase' : '🧹 Finger Erase') :
             handData.isPinching ? '🔧 Pinching' :
             handData.brushSizeAdjustment > 0 ? '👍 Increasing Brush (+5px)' :
             handData.brushSizeAdjustment < 0 ? '👎 Decreasing Brush (-5px)' :
             handData.isFist ? '✊ Fist (Stop)' : '🖐️ Hand Detected'}
          </span>
        </div>
        
        {/* Brush Size Info */}
        {brushSizeInfo && (
          <div className="mt-2 p-2 bg-gray-800/50 rounded">
            <div className="text-xs font-medium text-center">
              {brushSizeInfo}
            </div>
          </div>
        )}
        
        {/* Gesture Tips */}
        {gestureTips.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-300 mb-1">Current Gesture:</div>
            {gestureTips.map((tip, index) => (
              <div key={index} className="text-xs bg-gray-800/50 rounded px-3 py-1.5 mb-1">
                {tip}
              </div>
            ))}
          </div>
        )}
        
        {/* Stats */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
          <div className="text-xs">
            <div className="text-gray-400">Confidence</div>
            <div className="font-bold text-green-400">{Math.round(handData.confidence * 100)}%</div>
          </div>
          <div className="text-xs">
            <div className="text-gray-400">Landmarks</div>
            <div className="font-bold text-blue-400">{handData.landmarks?.length || 0}/21</div>
          </div>
          <div className="text-xs">
            <div className="text-gray-400">Brush Adj</div>
            <div className="font-bold text-purple-400">
              {handData.brushSizeAdjustment > 0 ? '+5px' : 
               handData.brushSizeAdjustment < 0 ? '-5px' : '0px'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};