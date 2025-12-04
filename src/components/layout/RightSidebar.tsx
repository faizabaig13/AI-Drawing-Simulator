
import React from "react";
import { PenTool, Eraser, Type, Image as ImageIcon, Download, Palette, MousePointer2, Hand, Move } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { motion } from "framer-motion";

interface ToolProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  color: string;
  setColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
}

const TOOLS = [
  { id: "pen", icon: PenTool, label: "Pen" },
  { id: "brush", icon: Palette, label: "Brush" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
  { id: "move", icon: Move, label: "Move" },
];

const COLORS = [
  "#ffffff", // White
  "#3b82f6", // Blue
  "#a855f7", // Purple
  "#06b6d4", // Cyan
  "#ef4444", // Red
  "#eab308", // Yellow
  "#10b981", // Emerald
  "#f43f5e", // Rose
];

export const RightSidebar = ({ activeTool, setActiveTool, color, setColor, brushSize, setBrushSize }: ToolProps) => {
  return (
    <motion.div 
      className="fixed right-4 top-24 bottom-8 w-20 z-40 flex flex-col pointer-events-none"
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <GlassCard className="pointer-events-auto h-full rounded-3xl py-6 px-2 flex flex-col items-center gap-6 bg-slate-950/60 border-white/10 shadow-2xl">
        
        {/* Tools */}
        <div className="flex flex-col gap-3 w-full items-center">
          {TOOLS.map((tool) => (
            <div key={tool.id} className="relative group w-full flex justify-center">
                {activeTool === tool.id && (
                    <motion.div 
                        layoutId="active-tool-bg"
                        className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-cyan-500 rounded-xl opacity-20 blur-sm"
                    />
                )}
              <button
                onClick={() => setActiveTool(tool.id)}
                className={`relative z-10 p-1 rounded-xl transition-all duration-300 group-hover:bg-white/5 ${
                  activeTool === tool.id 
                    ? "text-white shadow-inner bg-white/10 border border-white/10" 
                    : "text-white/40 hover:text-white"
                }`}
              >
                <tool.icon size={15} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
              </button>
              
              {/* Floating Label */}
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {tool.label}
              </div>
            </div>
          ))}
        </div>

        <div className="w-8 h-[1px] bg-white/10 my-2" />

        {/* Color Palette */}
        <div className="flex-1 flex flex-col gap-3 items-center overflow-y-auto w-full py-2
          [&::-webkit-scrollbar]:w-1
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-white/10
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb:hover]:bg-white/20
          hover:[&::-webkit-scrollbar-thumb]:bg-white/10
          [-ms-overflow-style:none]
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="group relative w-4 h-4 flex items-center justify-center"
            >
                <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                     color === c ? "opacity-100 blur-sm" : "opacity-0 group-hover:opacity-50 blur-sm"
                }`} style={{ backgroundColor: c }} />
                
                <div 
                    className={`relative w-4 h-4 rounded-full transition-all duration-300 border ${
                        color === c ? "w-4 h-4 border-white shadow-sm" : "border-transparent scale-90 group-hover:scale-110"
                    }`}
                    style={{ backgroundColor: c }}
                />
            </button>
          ))}
        </div>

        {/* Size Slider */}
        <div className="w-full flex flex-col items-center gap-4 pb-4">
            <div className="relative h-35 w-8 flex justify-center items-center bg-white/5 rounded-full border border-white/5 overflow-hidden">
                {/* Track Fill */}
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-cyan-500/20"
                    style={{ height: `${(brushSize / 50) * 100}%` }}
                />
                
                <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="absolute w-40 h-8 bg-transparent appearance-none -rotate-90 cursor-grab active:cursor-grabbing opacity-0"
                />
                
                {/* Visual Thumb */}
                <div 
                    className="absolute rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none transition-all duration-75"
                    style={{ 
                        bottom: `calc(${((brushSize - 1) / 49) * 100}% - 6px)`, 
                        width: '12px', 
                        height: '12px' 
                    }}
                />
            </div>
            <span className="text-[10px] font-mono text-white/40">{brushSize}px</span>
        </div>

      </GlassCard>
    </motion.div>
  );
};
