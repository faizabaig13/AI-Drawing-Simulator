// file name: App.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Header } from "./components/layout/Header";
import { LeftSidebar } from "./components/layout/LeftSidebar";
import { RightSidebar } from "./components/layout/RightSidebar";
import { DrawingCanvas } from "./components/canvas/DrawingCanvas";
import { GestureIndicator } from "./components/feedback/GestureIndicator";
import { WebcamPreview } from "./components/layout/WebcamPreview";
import { useLayers } from './hooks/useLayers';

const initialLayers = [
  {
    id: 'layer-1',
    name: 'Background',
    date: 'Just now',
    category: 'Background',
    visible: true,
    locked: false,
    opacity: 1
  },
  {
    id: 'layer-2',
    name: 'Sketch 1',
    date: 'Just now',
    category: 'Sketch',
    visible: true,
    locked: false,
    opacity: 1
  }
];

export default function App() {
  const [activeTool, setActiveTool] = useState("pen");
  const [color, setColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(8);
  const webcamRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState('initializing');
  const [debugInfo, setDebugInfo] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  const {
    layers,
    activeLayerId,
    addLayer,
    removeLayer,
    updateLayer,
    setActiveLayer,
    duplicateLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    renameLayer,
    moveLayer,
    getActiveLayer
  } = useLayers(initialLayers);

  const handleCanvasUpdate = (layerId, canvasData) => {
    updateLayer(layerId, { canvasData });
  };

  // Ensure MediaPipe scripts are loaded
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Check camera status
  useEffect(() => {
    const checkCameraStatus = () => {
      if (webcamRef.current && webcamRef.current.getVideoElement) {
        try {
          const video = webcamRef.current.getVideoElement();
          if (video && video.readyState >= 4) {
            setCameraStatus('active');
            setCameraReady(true);
            setDebugInfo(`Camera active - Show your hand to draw`);
          } else if (video) {
            setCameraStatus('loading');
            setDebugInfo(`Camera loading (state: ${video.readyState})`);
          }
        } catch (error) {
          console.log('Camera check error:', error);
        }
      }
    };

    // Initial check
    checkCameraStatus();
    
    // Check every second
    const interval = setInterval(checkCameraStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Manual camera controls
  const startCameraManually = useCallback(async () => {
    if (webcamRef.current && webcamRef.current.startCamera) {
      console.log('Manually starting camera...');
      try {
        await webcamRef.current.startCamera();
        setCameraStatus('starting');
        setDebugInfo('Starting camera...');
      } catch (error) {
        console.error('Manual start failed:', error);
        setCameraStatus('error');
        setDebugInfo(`Start failed: ${error.message}`);
      }
    }
  }, []);

  const stopCameraManually = useCallback(() => {
    if (webcamRef.current && webcamRef.current.stopCamera) {
      console.log('Manually stopping camera...');
      webcamRef.current.stopCamera();
      setCameraStatus('stopped');
      setCameraReady(false);
      setDebugInfo('Camera stopped');
    }
  }, []);

  // Test camera function
  const testCamera = async () => {
    console.log('Testing camera...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        } 
      });
      
      console.log('✅ Camera test successful!');
      setDebugInfo('✅ Camera test passed!');
      
      // Show success message
      alert('✅ Camera test successful!\n\nNow the hand tracking should work. Show your hand to the camera and try:\n\n1. Point index finger → DRAW\n2. Open palm → ERASE\n3. Pinch fingers → CHANGE BRUSH SIZE');
      
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('❌ Camera test failed:', error);
      setDebugInfo(`❌ Camera test failed: ${error.message}`);
      
      // Provide helpful error message
      let errorMessage = `❌ Camera test failed: ${error.message}\n\nPlease check:\n1. Camera permissions are granted\n2. Camera is not being used by another app\n`;
      
      if (!window.location.href.startsWith('https') && window.location.hostname !== 'localhost') {
        errorMessage += '3. You are not on HTTPS or localhost (required for camera)\n';
      }
      
      errorMessage += '4. Try using Chrome or Edge browser\n5. Make sure your hand is well-lit';
      
      alert(errorMessage);
    }
  };

  // Browser and security checks
  const getBrowserInfo = () => {
    try {
      const userAgent = navigator.userAgent || '';
      let browser = 'Unknown';
      
      if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) browser = 'Chrome ✅';
      else if (userAgent.includes('Firefox')) browser = 'Firefox ✅';
      else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari ⚠️';
      else if (userAgent.includes('Edge')) browser = 'Edge ✅';
      
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      
      return { browser, isSecure };
    } catch (error) {
      return { browser: 'Unknown', isSecure: false };
    }
  };

  const { browser, isSecure } = getBrowserInfo();

  return (
    <div className="relative w-full h-screen bg-[#0a0a0f] overflow-hidden font-sans select-none">
      {/* Background Ambient Glow & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.05),rgba(255,255,255,0))]" />
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/10 rounded-full blur-[150px] pointer-events-none" />
      
      {/* Top Layer Interface */}
      <WebcamPreview ref={webcamRef} />
      <Header />
      
      {/* Main Canvas Layer */}
      <DrawingCanvas 
        activeTool={activeTool} 
        color={color} 
        brushSize={brushSize} 
        webcamRef={webcamRef}
        cameraReady={cameraReady}
        onBrushSizeChange={setBrushSize}
        activeLayerId={activeLayerId}
        layers={layers}
        onCanvasUpdate={handleCanvasUpdate}
      />

      {/* Sidebars */}
      <LeftSidebar
        layers={layers}
        activeLayerId={activeLayerId}
        onLayerSelect={setActiveLayer}
        onLayerAdd={addLayer}
        onLayerDelete={removeLayer}
        onLayerDuplicate={duplicateLayer}
        onLayerVisibilityToggle={toggleLayerVisibility}
        onLayerLockToggle={toggleLayerLock}
        onLayerRename={renameLayer}
      />

      <RightSidebar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool}
        color={color}
        setColor={setColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
      />

      {/* Gesture Hints */}
      <GestureIndicator webcamRef={webcamRef} />

      {/* DEBUG PANEL */}
      <div className="fixed bottom-4 left-96 z-50 bg-black/90 backdrop-blur-sm text-white p-4 rounded-xl border border-white/20 shadow-2xl">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-cyan-400 font-mono">HAND TRACKING DEBUG</h3>
            <div className={`px-2 py-1 rounded text-xs font-bold ${
              cameraStatus === 'active' ? 'bg-green-900/50 text-green-400' :
              cameraStatus === 'error' ? 'bg-red-900/50 text-red-400' :
              cameraStatus === 'loading' ? 'bg-yellow-900/50 text-yellow-400' :
              'bg-gray-900/50 text-gray-400'
            }`}>
              {cameraStatus ? cameraStatus.toUpperCase() : 'UNKNOWN'}
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <button
              onClick={startCameraManually}
              className="px-3 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-all active:scale-95"
            >
              ▶️ START CAMERA
            </button>
            
            <button
              onClick={stopCameraManually}
              className="px-3 py-2 bg-red-900/50 hover:bg-red-800/50 rounded-lg text-sm font-medium border border-red-700/30"
            >
              ⏹️ STOP CAMERA
            </button>
            
            <button
              onClick={testCamera}
              className="px-3 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-sm font-medium"
            >
              🔧 TEST CAMERA
            </button>
          </div>
          
          <div className="text-xs text-gray-400 font-mono border-t border-white/10 pt-2">
            <div>Browser: {browser}</div>
            <div>HTTPS/Localhost: {isSecure ? '✅ Yes' : '❌ No (Required)'}</div>
            <div>Camera: {cameraStatus === 'active' ? '✅ Active' : '❌ Not active'}</div>
            <div className="mt-1 text-cyan-300 break-all max-w-xs">
              {debugInfo || 'Initializing...'}
            </div>
          </div>
          
          <div className="text-[10px] text-gray-500 text-center">
            Tips: Use front camera • Good lighting • Show entire hand
          </div>
        </div>
      </div>
    </div>
  );
}