# ✋ Gesture-Controlled Drawing App (React + TypeScript + MediaPipe)

A futuristic, touchless drawing tool that lets you draw, erase, and interact using only your hands and a webcam — no mouse or keyboard required. Powered by **MediaPipe Hands**, **React**, **TypeScript**, and the **HTML Canvas API**, this project explores natural human–computer interaction through real-time hand tracking and gesture recognition.

---

## 🚀 Features

### 🎨 Hands-Free Drawing
Draw on the canvas by simply raising your index finger.  
Strokes follow your hand with smooth, real-time accuracy.

### 🧼 Gesture-Based Tools
- ✏️ **Draw Mode** — index finger extended  
- 🧽 **Erase Mode** — open palm gesture  
- 🔍 **Brush Resize** — pinch gesture (thumb + index)  
- 🛑 **Stop Drawing** — closed fist  

### 🖐️ Precise Hand Skeleton Tracking
MediaPipe detects:
- 21 hand landmarks  
- Stabilized fingertip tracking  
- Smoothed coordinates  
- Accurate canvas mapping  

### 📸 Works 100% in the Browser
No installation, no backend, no server.  
Everything runs locally using your webcam.

### ⚛️ Built with Modern Web Tech
- React + TypeScript  
- MediaPipe Hands  
- TailwindCSS  
- Vite  
- Canvas 2D API  

---

## 🧠 How It Works

1. The webcam feed is processed frame-by-frame.  
2. MediaPipe Hands detects all 21 hand landmarks.  
3. Landmark positions are smoothed for stability.  
4. Gestures (draw, erase, pinch, fist) are interpreted.  
5. The Canvas API draws strokes directly under the fingertip using real-time coordinates.  
6. A visual hand skeleton overlays the video feed.

The result is a fast, natural, and intuitive touchless drawing experience.

---

## 📦 Installation

```bash
npm install
npm run dev
