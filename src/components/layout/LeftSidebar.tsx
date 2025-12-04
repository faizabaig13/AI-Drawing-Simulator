
// file name: LeftSidebar.tsx
import React, { useState, useEffect } from "react";
import { Plus, Search, Eye, EyeOff, Lock, Unlock, Trash2, Copy } from "lucide-react";
import { GlassCard } from "../ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { Layer } from "../../types/layer";

interface LeftSidebarProps {
  layers?: Layer[];
  activeLayerId?: string;
  onLayerSelect?: (id: string) => void;
  onLayerAdd?: () => void;
  onLayerDelete?: (id: string) => void;
  onLayerDuplicate?: (id: string) => void;
  onLayerVisibilityToggle?: (id: string) => void;
  onLayerLockToggle?: (id: string) => void;
  onLayerRename?: (id: string, newName: string) => void;
}

export const LeftSidebar = ({ 
  layers = [], 
  activeLayerId = '', 
  onLayerSelect = () => {}, 
  onLayerAdd = () => {}, 
  onLayerDelete = () => {},
  onLayerDuplicate = () => {},
  onLayerVisibilityToggle = () => {},
  onLayerLockToggle = () => {},
  onLayerRename = () => {}
}: LeftSidebarProps) => {
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Safe filter with default empty array
  const filteredLayers = (layers || []).filter(layer =>
    layer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    layer.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim()) {
      onLayerRename(id, renameValue.trim());
    }
    setIsRenaming(null);
    setRenameValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(id);
    } else if (e.key === 'Escape') {
      setIsRenaming(null);
      setRenameValue("");
    }
  };

  const handleAddLayer = () => {
    onLayerAdd();
  };

  return (
    <motion.div 
      className="fixed left-4 top-48 bottom-8 w-96 z-40 flex flex-col pointer-events-none mt-20"
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <GlassCard className="pointer-events-auto h-full rounded-3xl p-6 flex flex-col gap-6 bg-slate-950/80 border-white/10 shadow-2xl backdrop-blur-xl">
        
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-md tracking-tight">Layers ({layers.length})</h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search layers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:border-cyan-500/50 w-40"
              />
            </div>
            <button 
              onClick={handleAddLayer}
              className="p-2 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all bg-gradient-to-br from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30"
              title="Add New Layer"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 
          [&::-webkit-scrollbar]:w-2
          [&::-webkit-scrollbar-track]:bg-transparent
          [&::-webkit-scrollbar-thumb]:bg-white/10
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-thumb:hover]:bg-white/20
          hover:[&::-webkit-scrollbar-thumb]:bg-white/10
          [-ms-overflow-style:none]
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden">
          <AnimatePresence>
            {filteredLayers.map((layer) => (
              <motion.div
                key={layer.id}
                layoutId={layer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="group relative"
              >
                <div 
                  className={`absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-md transition-opacity duration-300 ${
                    activeLayerId === layer.id ? "opacity-100" : "opacity-0 group-hover:opacity-30"
                  }`} 
                />
                
                <GlassCard 
                  className={`relative rounded-xl p-4 cursor-pointer transition-all duration-200 border backdrop-blur-sm ${
                    activeLayerId === layer.id 
                      ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 to-transparent shadow-[0_0_30px_rgba(6,182,212,0.3)]" 
                      : "border-transparent bg-white/5 hover:bg-white/10"
                  }`}
                  hoverEffect={false}
                  onClick={() => onLayerSelect(layer.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      {isRenaming === layer.id ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, layer.id)}
                          onBlur={() => handleRenameSubmit(layer.id)}
                          autoFocus
                          className="w-full bg-transparent text-white font-medium border-b border-cyan-500/50 focus:outline-none text-sm"
                        />
                      ) : (
                        <span 
                          className={`text-sm font-medium cursor-text ${
                            activeLayerId === layer.id ? "text-white" : "text-white/70"
                          }`}
                          onDoubleClick={() => {
                            setIsRenaming(layer.id);
                            setRenameValue(layer.name);
                          }}
                        >
                          {layer.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {activeLayerId === layer.id && (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)]" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerVisibilityToggle(layer.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title={layer.visible ? "Hide Layer" : "Show Layer"}
                      >
                        {layer.visible ? (
                          <Eye size={12} className="text-white/70" />
                        ) : (
                          <EyeOff size={12} className="text-white/40" />
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerLockToggle(layer.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                      >
                        {layer.locked ? (
                          <Lock size={12} className="text-white/70" />
                        ) : (
                          <Unlock size={12} className="text-white/40" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerDuplicate(layer.id);
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Duplicate Layer"
                      >
                        <Copy size={12} className="text-white/40" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLayerDelete(layer.id);
                        }}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Layer"
                        disabled={layers.length <= 1}
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                      
                      <span className="text-[10px] text-white/40 font-mono uppercase">
                        {layer.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between text-[10px] text-white/40">
                    <span>{layer.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                          style={{ width: `${layer.opacity * 100}%` }}
                        />
                      </div>
                      <span>{Math.round(layer.opacity * 100)}%</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredLayers.length === 0 && (
            <div className="text-center py-8">
              <div className="text-white/40 text-sm">No layers found</div>
              <button
                onClick={handleAddLayer}
                className="mt-4 px-4 py-2 text-sm bg-gradient-to-r from-cyan-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-purple-500/30 text-white/60 rounded-lg transition-all"
              >
                Create New Layer
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-white/60">Active Layer</span>
            <span className="text-sm text-white font-medium">
              {layers.find(l => l.id === activeLayerId)?.name || "None"}
            </span>
          </div>
          
          <button 
            onClick={handleAddLayer}
            className="w-full py-3 rounded-xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={16} />
            <span>Add New Layer</span>
          </button>
          
          <div className="mt-4 flex gap-2">
            <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs flex items-center justify-center gap-1 transition-colors">
              <span>Import</span>
            </button>
            <button className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs flex items-center justify-center gap-1 transition-colors">
              <span>Export All</span>
            </button>
          </div>
        </div>

      </GlassCard>
    </motion.div>
  );
};
