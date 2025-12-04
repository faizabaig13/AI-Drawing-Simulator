import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { Camera, Shield, RefreshCw } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { useHandTracking } from "../../hooks/useHandTracking";

export interface WebcamPreviewHandle {
  getVideoElement: () => HTMLVideoElement | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  getHandData: () => any;
}

export const WebcamPreview = forwardRef<WebcamPreviewHandle>((props, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'initializing' | 'active' | 'denied'>('initializing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [handCanvasCtx, setHandCanvasCtx] = useState<CanvasRenderingContext2D | null>(null);

  // Use hand tracking hook - ONLY for skeleton display
  const handData = useHandTracking({
    videoElement: status === 'active' ? videoRef.current : null,
    canvasRef: canvasRef
  });

  // Initialize hand tracking canvas
  useEffect(() => {
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        setHandCanvasCtx(ctx);
        // Set canvas size to match video
        const video = videoRef.current;
        canvasRef.current.width = video.videoWidth || video.clientWidth;
        canvasRef.current.height = video.videoHeight || video.clientHeight;
      }
    }
  }, [status]);

  // Update canvas size when video dimensions change
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && videoRef.current && status === 'active') {
        const video = videoRef.current;
        const videoWidth = video.videoWidth || video.clientWidth;
        const videoHeight = video.videoHeight || video.clientHeight;
        
        if (videoWidth > 0 && videoHeight > 0) {
          canvasRef.current.width = videoWidth;
          canvasRef.current.height = videoHeight;
        }
      }
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', updateCanvasSize);
      videoRef.current.addEventListener('resize', updateCanvasSize);
      updateCanvasSize();
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', updateCanvasSize);
        videoRef.current.removeEventListener('resize', updateCanvasSize);
      }
    };
  }, [status]);

  // Draw hand skeleton on canvas
  useEffect(() => {
    if (!handCanvasCtx || !handData.landmarks || !canvasRef.current || !handData.handDetected) {
      // Clear canvas if no hand detected
      if (handCanvasCtx && canvasRef.current) {
        handCanvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const ctx = handCanvasCtx;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Get actual video dimensions
    const videoWidth = video?.videoWidth || canvas.width;
    const videoHeight = video?.videoHeight || canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing style based on gesture
    let skeletonColor = '#3b82f6';
    if (handData.isDrawing) skeletonColor = '#00ff00';
    if (handData.isErasing) skeletonColor = '#ff0000';
    if (handData.isPinching) skeletonColor = '#ffff00';
    
    ctx.strokeStyle = skeletonColor;
    ctx.fillStyle = skeletonColor;
    ctx.lineWidth = 2;
    
    const landmarks = handData.landmarks;
    const width = videoWidth;
    const height = videoHeight;
    
    // DRAW ALL 21 LANDMARKS
    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      // Convert normalized coordinates to canvas coordinates
      // Mirror x-axis for selfie view (CSS scaleX(-1) is applied to video)
      const x = (1 - landmark.x) * width;
      const y = landmark.y * height;
      
      // Draw landmark as colored circle
      ctx.beginPath();
      ctx.arc(x, y, i === 8 ? 6 : 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // DRAW BONE CONNECTIONS (Hand Skeleton)
    const CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm connections
    ];
    
    for (const [start, end] of CONNECTIONS) {
      const startLandmark = landmarks[start];
      const endLandmark = landmarks[end];
      
      if (startLandmark && endLandmark) {
        const startX = (1 - startLandmark.x) * width;
        const startY = startLandmark.y * height;
        const endX = (1 - endLandmark.x) * width;
        const endY = endLandmark.y * height;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
  }, [handData, handCanvasCtx]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current,
    startCamera: async () => {
      await initCamera();
    },
    stopCamera: () => {
      stopCamera();
    },
    getHandData: () => handData
  }));

  // DIRECT CAMERA INITIALIZATION
  const initCamera = async () => {
    console.log('🚀 Starting camera...');
    setStatus('initializing');
    setErrorMessage('');
    
    // Clear any existing stream
    stopCamera();
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser does not support camera.');
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false 
      });
      
      streamRef.current = stream;
      
      // Setup video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        
        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('✅ Camera active');
                console.log('Video dimensions:', {
                  videoWidth: videoRef.current?.videoWidth,
                  videoHeight: videoRef.current?.videoHeight,
                  clientWidth: videoRef.current?.clientWidth,
                  clientHeight: videoRef.current?.clientHeight
                });
                setStatus('active');
                
                // Setup canvas size to match video
                if (canvasRef.current && videoRef.current) {
                  const videoWidth = videoRef.current.videoWidth;
                  const videoHeight = videoRef.current.videoHeight;
                  if (videoWidth > 0 && videoHeight > 0) {
                    canvasRef.current.width = videoWidth;
                    canvasRef.current.height = videoHeight;
                  }
                }
              })
              .catch(playError => {
                console.error('Play error:', playError);
                setStatus('denied');
                setErrorMessage('Failed to play video');
              });
          }
        };
      }
      
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      setStatus('denied');
      
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Permission denied. Allow camera access.');
      } else if (error.name === 'NotFoundError') {
        setErrorMessage('No camera found.');
      } else {
        setErrorMessage(error.message || 'Camera error');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('denied');
  };

  // Manual restart
  const handleRestartCamera = async () => {
    await initCamera();
  };

  // Start camera on mount
  useEffect(() => {
    initCamera();

    return () => {
      stopCamera();
    };
  }, []);

  // Debug info
  const getDebugInfo = () => {
    if (!handData.handDetected) return 'No hand detected';
    
    return `Hand: ${handData.isDrawing ? 'DRAW' : handData.isErasing ? 'ERASE' : handData.isPinching ? 'PINCH' : 'IDLE'} | ` +
           `Conf: ${Math.round(handData.confidence * 100)}%`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-4 left-4 z-50"
    >
      <GlassCard className="relative p-1 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.3)] border-white/20 bg-black/60">
      <div className="relative w-96 h-64 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center group">
          
          {/* Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${status === 'active' ? 'block' : 'hidden'}`}
            style={{ transform: 'scaleX(-1)' }}
          />
          
          {/* Hand Tracking Overlay Canvas */}
          {status === 'active' && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          
          {/* ACTIVE STATE OVERLAY */}
          {status === 'active' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-2 left-2 flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  handData.handDetected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-[10px] font-mono text-white/90 font-bold">
                  {handData.handDetected ? 'HAND DETECTED' : 'NO HAND'}
                </span>
              </div>
              
              <button
                onClick={handleRestartCamera}
                className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 rounded-full p-2 shadow-lg transition-all"
                title="Restart Camera"
              >
                <RefreshCw size={14} className="text-white" />
              </button>
              
              {/* Debug info */}
              <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
                {getDebugInfo()}
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'denied' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
              <div className="flex flex-col items-center gap-3 text-center px-4">
                <Shield size={28} className="text-red-400" />
                
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-mono text-red-400 font-bold">CAMERA ERROR</span>
                  <span className="text-xs text-red-300/80 font-mono max-w-[140px]">
                    {errorMessage || 'Camera not working'}
                  </span>
                </div>
                
                <button
                  onClick={handleRestartCamera}
                  className="px-4 py-2 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-mono font-bold transition-all"
                >
                  TRY AGAIN
                </button>
              </div>
            </div>
          )}

          {/* INITIALIZING STATE */}
          {status === 'initializing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
              <div className="flex flex-col items-center gap-3">
                <Camera size={28} className="text-cyan-400 animate-pulse" />
                <span className="text-sm font-mono text-white font-bold">LOADING CAMERA</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Common overlay */}
          <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
        </div>
      </GlassCard>
    </motion.div>
  );
});

WebcamPreview.displayName = "WebcamPreview";