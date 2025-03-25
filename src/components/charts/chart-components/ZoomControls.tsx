
import React from 'react';
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RefreshCw, MoveHorizontal } from 'lucide-react';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  isPanMode: boolean;
  onTogglePanMode: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  isPanMode,
  onTogglePanMode,
  canZoomIn,
  canZoomOut
}) => {
  return (
    <div className="flex items-center gap-1 bg-background/90 border rounded-md p-1 shadow-sm absolute bottom-12 right-4 z-10">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onReset}
        title="Reset Zoom"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-5 bg-border mx-1" />
      
      <Button
        variant={isPanMode ? "secondary" : "ghost"}
        size="icon"
        className="h-7 w-7"
        onClick={onTogglePanMode}
        title={isPanMode ? "Exit Pan Mode" : "Enter Pan Mode"}
      >
        <MoveHorizontal className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default ZoomControls;
