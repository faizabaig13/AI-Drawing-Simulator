import { useEffect, useRef, useState, useCallback } from "react";

export interface HandTrackingData {
  handDetected: boolean;
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  cursor: { x: number; y: number };
  isDrawing: boolean;
  isErasing: boolean;
  isPinching: boolean;
  isFist: boolean;
  isPalmOpen: boolean; // New: Palm gesture for erasing
  confidence: number;
  indexFingerTip: { x: number; y: number } | null;
  pinchDistance: number;
  handInFrame: boolean;
  brushSizeAdjustment: number; // -1, 0, +1 for brush size control
  gestureHistory: string[]; // Track recent gestures for stability
}

interface UseHandTrackingProps {
  videoElement?: HTMLVideoElement | null;
  onBrushSizeChange?: (size: number) => void;
  onToolChange?: (tool: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export const useHandTracking = (props?: UseHandTrackingProps): HandTrackingData => {
  const { videoElement, onBrushSizeChange, onToolChange, canvasRef } = props || {};
  
  const [handData, setHandData] = useState<HandTrackingData>({
    handDetected: false,
    landmarks: null,
    cursor: { x: -100, y: -100 },
    isDrawing: false,
    isErasing: false,
    isPinching: false,
    isFist: false,
    isPalmOpen: false,
    confidence: 0,
    indexFingerTip: null,
    pinchDistance: 0,
    handInFrame: false,
    brushSizeAdjustment: 0,
    gestureHistory: []
  });

  const detectorRef = useRef<any>(null);
  const requestRef = useRef<number>(0);
  const animationRef = useRef<number>(0);
  const isDetectingRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  
  // For cursor smoothing
  const cursorHistoryRef = useRef<Array<{x: number, y: number}>>([]);
  const MAX_HISTORY = 10;
  
  // For gesture stability
  const gestureStabilityRef = useRef<{
    drawing: number;
    erasing: number;
    pinching: number;
    fist: number;
    palmOpen: number;
  }>({ drawing: 0, erasing: 0, pinching: 0, fist: 0, palmOpen: 0 });

  // Enhanced Gesture Recognition with palm detection
  const checkGestures = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) {
      return { 
        isPinching: false, 
        isFist: false, 
        isDrawing: false, 
        isErasing: false, 
        isPalmOpen: false,
        pinchDist: 0,
        brushSizeAdjustment: 0 
      };
    }

    try {
      // Key landmarks indices
      const INDEX_TIP = 8;
      const INDEX_PIP = 6;
      const INDEX_MCP = 5;
      const MIDDLE_TIP = 12;
      const MIDDLE_PIP = 10;
      const MIDDLE_MCP = 9;
      const RING_TIP = 16;
      const RING_PIP = 14;
      const PINKY_TIP = 20;
      const PINKY_PIP = 18;
      const THUMB_TIP = 4;
      const THUMB_IP = 3;
      const THUMB_MCP = 2;
      const WRIST = 0;

      // Calculate distance between two points
      const distance = (p1: any, p2: any) => 
        Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

      // Calculate angle between three points
      const angle = (a: any, b: any, c: any) => {
        const ab = { x: b.x - a.x, y: b.y - a.y };
        const cb = { x: b.x - c.x, y: b.y - c.y };
        
        const dot = (ab.x * cb.x + ab.y * cb.y);
        const cross = (ab.x * cb.y - ab.y * cb.x);
        
        return Math.atan2(cross, dot) * (180 / Math.PI);
      };

      // Check if finger is extended (pointing)
      const isExtended = (tip: number, pip: number, mcp: number) => {
        const tipAboveMcp = landmarks[tip].y < landmarks[mcp].y;
        const fingerAngle = Math.abs(angle(landmarks[mcp], landmarks[pip], landmarks[tip]));
        return tipAboveMcp && fingerAngle > 150;
      };

      // Check if finger is curled
      const isCurled = (tip: number, pip: number) => 
        landmarks[tip].y > landmarks[pip].y;

      // 1. PALM OPEN GESTURE (for erasing)
      // Check if all fingers are extended and palm is facing camera
      const isPalmOpen = 
        isExtended(INDEX_TIP, INDEX_PIP, INDEX_MCP) &&
        isExtended(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP) &&
        isExtended(RING_TIP, RING_PIP, INDEX_MCP) &&
        isExtended(PINKY_TIP, PINKY_PIP, INDEX_MCP) &&
        distance(landmarks[WRIST], landmarks[MIDDLE_MCP]) > 0.2; // Palm is open

      // 2. PINCH - thumb and index close
      const pinchDist = distance(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
      const isPinching = pinchDist < 0.07 && !isPalmOpen;

      // 3. FIST - all fingers curled
      const isFist = 
        isCurled(INDEX_TIP, INDEX_PIP) &&
        isCurled(MIDDLE_TIP, MIDDLE_PIP) &&
        isCurled(RING_TIP, RING_PIP) &&
        isCurled(PINKY_TIP, PINKY_PIP) &&
        distance(landmarks[INDEX_TIP], landmarks[WRIST]) < 0.2 &&
        !isPalmOpen;

      // 4. DRAWING - ONLY index extended, others curled
      const isDrawing = 
        isExtended(INDEX_TIP, INDEX_PIP, INDEX_MCP) &&
        !isExtended(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP) &&
        isCurled(MIDDLE_TIP, MIDDLE_PIP) &&
        isCurled(RING_TIP, RING_PIP) &&
        isCurled(PINKY_TIP, PINKY_PIP) &&
        !isPinching &&
        !isFist &&
        !isPalmOpen;

      // 5. ERASING - original gesture (middle + index extended)
      const isErasing = 
        isExtended(INDEX_TIP, INDEX_PIP, INDEX_MCP) &&
        isExtended(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP) &&
        !isExtended(RING_TIP, RING_PIP, INDEX_MCP) &&
        !isExtended(PINKY_TIP, PINKY_PIP, INDEX_MCP) &&
        !isPinching &&
        !isFist &&
        !isPalmOpen;

      // 6. BRUSH SIZE CONTROL GESTURES
      let brushSizeAdjustment = 0;
      
      // GESTURE 1: Thumb up for increasing brush size
      const isThumbUp = 
        landmarks[THUMB_TIP].y < landmarks[THUMB_IP].y &&
        landmarks[THUMB_TIP].y < landmarks[INDEX_MCP].y &&
        isCurled(INDEX_TIP, INDEX_PIP) &&
        isCurled(MIDDLE_TIP, MIDDLE_PIP);

      // GESTURE 2: Thumb down for decreasing brush size
      const isThumbDown = 
        landmarks[THUMB_TIP].y > landmarks[THUMB_IP].y &&
        landmarks[THUMB_TIP].y > landmarks[INDEX_MCP].y &&
        isCurled(INDEX_TIP, INDEX_PIP) &&
        isCurled(MIDDLE_TIP, MIDDLE_PIP);

      // GESTURE 3: Peace sign (index + middle up) for increasing brush size
      const isPeaceSign = 
        isExtended(INDEX_TIP, INDEX_PIP, INDEX_MCP) &&
        isExtended(MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP) &&
        isCurled(RING_TIP, RING_PIP) &&
        isCurled(PINKY_TIP, PINKY_PIP) &&
        !isPinching &&
        !isFist &&
        !isPalmOpen;

      // GESTURE 4: OK sign (pinch with other fingers curled) for decreasing brush size
      const isOKSign = 
        pinchDist < 0.06 &&
        isCurled(MIDDLE_TIP, MIDDLE_PIP) &&
        isCurled(RING_TIP, RING_PIP) &&
        isCurled(PINKY_TIP, PINKY_PIP);

      // Priority: Peace sign > OK sign > Thumb up/down
      if (isPeaceSign) {
        brushSizeAdjustment = 1; // Increase brush size
      } else if (isOKSign) {
        brushSizeAdjustment = -1; // Decrease brush size
      } else if (isThumbUp) {
        brushSizeAdjustment = 1;
      } else if (isThumbDown) {
        brushSizeAdjustment = -1;
      }

      return { 
        isPinching, 
        isFist, 
        isDrawing, 
        isErasing, 
        isPalmOpen,
        pinchDist,
        brushSizeAdjustment 
      };
    } catch (error) {
      console.error('Gesture check error:', error);
      return { 
        isPinching: false, 
        isFist: false, 
        isDrawing: false, 
        isErasing: false, 
        isPalmOpen: false,
        pinchDist: 0,
        brushSizeAdjustment: 0 
      };
    }
  }, []);

  // Initialize MediaPipe
  const initMediaPipe = useCallback(async () => {
    if (detectorRef.current) return detectorRef.current;

    // Load MediaPipe if not loaded
    if (!window.Hands) {
      console.log('Loading MediaPipe Hands...');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script.onload = () => console.log('MediaPipe Hands loaded');
      document.head.appendChild(script);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    try {
      // @ts-ignore
      const hands = new window.Hands({
        locateFile: (file: string) => 
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
        selfieMode: true
      });

      hands.onResults((results: any) => {
        frameCountRef.current++;
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          const handedness = results.multiHandedness?.[0];
          const { 
            isPinching, 
            isFist, 
            isDrawing, 
            isErasing, 
            isPalmOpen,
            pinchDist,
            brushSizeAdjustment 
          } = checkGestures(landmarks);
          
          // Use index finger for drawing, but use center of palm for palm gestures
          let trackingPoint = landmarks[8]; // Index finger tip
          
          if (isPalmOpen) {
            // Use center of palm for better stability with palm gesture
            const palmCenter = {
              x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
              y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5
            };
            trackingPoint = palmCenter;
          }
          
          // Calculate cursor position
          let cursorX = 0, cursorY = 0;
          
          if (canvasRef?.current && videoElement) {
            const canvas = canvasRef.current;
            const canvasRect = canvas.getBoundingClientRect();
            const canvasWidth = canvasRect.width;
            const canvasHeight = canvasRect.height;
            
            const videoWidth = videoElement.videoWidth || 640;
            const videoHeight = videoElement.videoHeight || 480;
            
            if (videoWidth > 0 && videoHeight > 0 && canvasWidth > 0 && canvasHeight > 0) {
              const handX = trackingPoint.x;
              const handY = trackingPoint.y;
              
              // Simple direct mapping
              cursorX = handX * canvasWidth;
              cursorY = handY * canvasHeight;
              
              // Enhanced smoothing with adaptive weights
              cursorHistoryRef.current.push({ x: cursorX, y: cursorY });
              if (cursorHistoryRef.current.length > MAX_HISTORY) {
                cursorHistoryRef.current.shift();
              }
              
              // Exponential smoothing (more weight to recent positions)
              let smoothedX = 0;
              let smoothedY = 0;
              let totalWeight = 0;
              const alpha = 0.8; // Smoothing factor
              
              cursorHistoryRef.current.forEach((pos, index) => {
                const weight = Math.pow(alpha, cursorHistoryRef.current.length - index - 1);
                smoothedX += pos.x * weight;
                smoothedY += pos.y * weight;
                totalWeight += weight;
              });
              
              smoothedX /= totalWeight;
              smoothedY /= totalWeight;
              
              // Predictive smoothing based on velocity
              if (cursorHistoryRef.current.length >= 3) {
                const lastPos = cursorHistoryRef.current[cursorHistoryRef.current.length - 1];
                const secondLastPos = cursorHistoryRef.current[cursorHistoryRef.current.length - 2];
                const velocityX = lastPos.x - secondLastPos.x;
                const velocityY = lastPos.y - secondLastPos.y;
                
                // Add slight prediction based on velocity
                smoothedX += velocityX * 0.3;
                smoothedY += velocityY * 0.3;
              }
              
              // Boundary clamping with margin
              const margin = 5;
              smoothedX = Math.max(margin, Math.min(smoothedX, canvasWidth - margin));
              smoothedY = Math.max(margin, Math.min(smoothedY, canvasHeight - margin));
              
              cursorX = smoothedX;
              cursorY = smoothedY;
            }
          }

          // Apply gesture stability with hysteresis
          const GESTURE_HYSTERESIS = 4;
          
          if (isDrawing) gestureStabilityRef.current.drawing++;
          else gestureStabilityRef.current.drawing = 0;
          
          if (isErasing) gestureStabilityRef.current.erasing++;
          else gestureStabilityRef.current.erasing = 0;
          
          if (isPalmOpen) gestureStabilityRef.current.palmOpen++;
          else gestureStabilityRef.current.palmOpen = 0;
          
          if (isPinching) gestureStabilityRef.current.pinching++;
          else gestureStabilityRef.current.pinching = 0;
          
          if (isFist) gestureStabilityRef.current.fist++;
          else gestureStabilityRef.current.fist = 0;

          const stableIsDrawing = gestureStabilityRef.current.drawing >= GESTURE_HYSTERESIS;
          const stableIsErasing = gestureStabilityRef.current.erasing >= GESTURE_HYSTERESIS;
          const stableIsPalmOpen = gestureStabilityRef.current.palmOpen >= GESTURE_HYSTERESIS;
          const stableIsPinching = gestureStabilityRef.current.pinching >= GESTURE_HYSTERESIS;
          const stableIsFist = gestureStabilityRef.current.fist >= GESTURE_HYSTERESIS;

          // Update gesture history
          const currentGesture = stableIsDrawing ? 'drawing' : 
                                stableIsErasing ? 'erasing' : 
                                stableIsPalmOpen ? 'palm' : 
                                stableIsPinching ? 'pinching' : 
                                stableIsFist ? 'fist' : 'idle';

          const newGestureHistory = [...handData.gestureHistory, currentGesture].slice(-10);

          setHandData({
            handDetected: true,
            landmarks: landmarks,
            cursor: { x: cursorX, y: cursorY },
            isDrawing: stableIsDrawing,
            isErasing: stableIsErasing || stableIsPalmOpen, // Both gestures trigger erasing
            isPinching: stableIsPinching,
            isFist: stableIsFist,
            isPalmOpen: stableIsPalmOpen,
            confidence: handedness?.score || 0.7,
            indexFingerTip: { x: landmarks[8].x, y: landmarks[8].y },
            pinchDistance: pinchDist,
            handInFrame: true,
            brushSizeAdjustment: brushSizeAdjustment,
            gestureHistory: newGestureHistory
          });
        } else {
          // No hand detected
          cursorHistoryRef.current = [];
          gestureStabilityRef.current = { drawing: 0, erasing: 0, pinching: 0, fist: 0, palmOpen: 0 };
          
          setHandData(prev => ({
            ...prev,
            handDetected: false,
            handInFrame: false,
            isDrawing: false,
            isErasing: false,
            isPinching: false,
            isFist: false,
            isPalmOpen: false,
            brushSizeAdjustment: 0,
            landmarks: null,
            gestureHistory: []
          }));
        }
      });

      detectorRef.current = hands;
      return hands;
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      return null;
    }
  }, [videoElement, canvasRef, checkGestures]);

  // Detection loop
  const startDetection = useCallback(async () => {
    if (!videoElement || isDetectingRef.current) return;

    const detector = await initMediaPipe();
    if (!detector) return;

    isDetectingRef.current = true;

    const detect = async () => {
      if (!isDetectingRef.current || !videoElement || videoElement.readyState < 2) {
        animationRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        await detector.send({ image: videoElement });
      } catch (error) {
        console.error('MediaPipe send error:', error);
      }

      if (isDetectingRef.current) {
        animationRef.current = requestAnimationFrame(detect);
      }
    };

    animationRef.current = requestAnimationFrame(detect);
  }, [videoElement, initMediaPipe]);

  // Stop detection
  const stopDetection = useCallback(() => {
    isDetectingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, []);

  // Main effect
  useEffect(() => {
    if (!videoElement) {
      stopDetection();
      return;
    }

    const handleVideoReady = () => {
      if (videoElement.readyState >= 2) {
        console.log('Video ready, starting hand detection');
        startDetection();
      }
    };

    if (videoElement.readyState >= 2) {
      startDetection();
    } else {
      videoElement.addEventListener('loadeddata', handleVideoReady);
      videoElement.addEventListener('canplay', handleVideoReady);
    }

    return () => {
      stopDetection();
      videoElement.removeEventListener('loadeddata', handleVideoReady);
      videoElement.removeEventListener('canplay', handleVideoReady);
    };
  }, [videoElement, startDetection, stopDetection]);

  return handData;
};