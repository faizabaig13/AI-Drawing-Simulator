// file name: hooks/useLayers.ts
import { useState, useCallback } from 'react';
import { Layer } from '../types/layer';

export const useLayers = (initialLayers: Layer[] = []) => {
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [activeLayerId, setActiveLayerId] = useState<string>(initialLayers[0]?.id || '');

  const addLayer = useCallback(() => {
    const sketchLayers = layers.filter(l => l.category === 'Sketch');
    const newId = `layer-${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: `Sketch ${sketchLayers.length + 1}`,
      date: 'Just now',
      category: 'Sketch',
      visible: true,
      locked: false,
      opacity: 1
    };
    
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newId);
  }, [layers]);

  const removeLayer = useCallback((id: string) => {
    if (layers.length <= 1) return;
    
    setLayers(prev => prev.filter(layer => layer.id !== id));
    
    if (activeLayerId === id) {
      const remainingLayers = layers.filter(l => l.id !== id);
      setActiveLayerId(remainingLayers[remainingLayers.length - 1]?.id || '');
    }
  }, [layers, activeLayerId]);

  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  }, []);

  const setActiveLayer = useCallback((id: string) => {
    setActiveLayerId(id);
  }, []);

  const duplicateLayer = useCallback((id: string) => {
    const layerToDuplicate = layers.find(l => l.id === id);
    if (!layerToDuplicate) return;

    const newId = `layer-${Date.now()}`;
    const newLayer: Layer = {
      ...layerToDuplicate,
      id: newId,
      name: `${layerToDuplicate.name} Copy`,
      date: 'Just now'
    };

    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newId);
  }, [layers]);

  const toggleLayerVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  const toggleLayerLock = useCallback((id: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    ));
  }, []);

  const renameLayer = useCallback((id: string, newName: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, name: newName } : layer
    ));
  }, []);

  const moveLayer = useCallback((fromIndex: number, toIndex: number) => {
    setLayers(prev => {
      const newLayers = [...prev];
      const [movedLayer] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, movedLayer);
      return newLayers;
    });
  }, []);

  const getActiveLayer = useCallback(() => {
    return layers.find(l => l.id === activeLayerId);
  }, [layers, activeLayerId]);

  return {
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
  };
};