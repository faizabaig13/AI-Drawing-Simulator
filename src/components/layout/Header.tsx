import React, { useEffect, useState } from "react";
import { Battery, Activity, Wifi } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";

export const Header = () => {
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(Math.floor(Math.random() * (60 - 55 + 1) + 55));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 p-4 flex justify-center items-start pointer-events-none">
      {/* Centered Status Bar */}
      <GlassCard className="pointer-events-auto px-8 py-3 rounded-full flex items-center gap-8 mt-2 bg-black/40 border-white/5">
         {/* Logo integrated into status bar */}
        <div className="flex items-center gap-3 border-r border-white/10 pr-8">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <span className="font-bold text-white text-sm">G</span>
            </div>
            <h1 className="text-white font-bold tracking-wider text-sm">GESTURE<span className="text-cyan-400 font-light">DRAW</span></h1>
        </div>

        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] text-white/70 font-mono tracking-widest">ONLINE</span>
            </div>
            
            <div className="flex items-center gap-2 text-white/60">
            <Activity size={14} className="text-cyan-400" />
            <span className="text-[10px] font-mono">{fps} FPS</span>
            </div>

            <div className="flex items-center gap-2 text-white/60">
            <Battery size={14} className="text-purple-400" />
            <span className="text-[10px] font-mono">100%</span>
            </div>
        </div>
      </GlassCard>
    </header>
  );
};
