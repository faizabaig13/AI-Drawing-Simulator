// file name: types/layer.ts
export interface Layer {
  id: string;
  name: string;
  date: string;
  category: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  canvasData?: string; // Base64 image data
}

export interface LayerManager {
  layers: Layer[];
  activeLayerId: string;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  setActiveLayer: (id: string) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
}