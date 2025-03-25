
import { RegexPattern } from "@/components/regex/RegexManager";

export interface LogData {
  timestamp: Date;
  values: { [key: string]: number | string };
}

export interface Signal {
  id: string;
  name: string;
  pattern: RegexPattern;
  color: string;
  visible: boolean;
}

export interface ChartPanel {
  id: string;
  signals: string[];
}

export interface LogChartProps {
  logContent: string;
  patterns: RegexPattern[];
  className?: string;
}

export interface ChartControlsProps {
  dataStats: {
    total: number;
    displayed: number;
    samplingRate: number;
    currentPage?: number;
    totalPages?: number;
  };
  timeNavigation: 'preset' | 'pagination' | 'window' | 'segments';
  timeRangePreset: string;
  timeWindowSize: number;
  customTimeRange: { start?: Date; end?: Date };
  maxDisplayPoints: number;
  chartType: 'line' | 'bar';
  zoomDomain: { start?: number; end?: number };
  formattedChartData: any[];
  currentPage: number;
  isProcessing: boolean;
  selectedSegment?: string;
  timeSegments: TimeSegment[];
  onTimeRangePresetChange: (preset: string) => void;
  onTimeWindowSizeChange: (size: number) => void;
  onNavigateTimeWindow: (direction: 'forward' | 'backward') => void;
  onNavigateTime: (direction: 'forward' | 'backward') => void;
  onMaxPointsChange: (points: number[]) => void;
  onChartTypeChange: (type: 'line' | 'bar') => void;
  onZoomReset: () => void;
  onSegmentChange?: (segmentId: string) => void;
  renderPaginationControls: () => React.ReactNode;
}

export interface PanelTabsManagerProps {
  panels: ChartPanel[];
  activeTab: string;
  signals: Signal[];
  onActiveTabChange: (tabId: string) => void;
  onAddPanel: () => void;
  onRemovePanel: (panelId: string) => void;
  onAddSignal: (panelId: string, signalId: string) => void;
  onRemoveSignal: (panelId: string, signalId: string) => void;
  onToggleSignalVisibility: (signalId: string) => void;
  renderChartDisplay: (panelId: string) => React.ReactNode;
}

export interface ChartDisplayProps {
  containerRef?: React.RefObject<HTMLDivElement>;
  chartType: 'line' | 'bar';
  visibleChartData: any[];
  zoomDomain?: { start?: number; end?: number };
  signals: Signal[];
  onZoomDomainChange?: (domain: any) => void;
  onBrushChange?: (brushData: any) => void;
  zoomMode?: 'all' | 'custom';
  zoomRange?: { start: number | null; end: number | null };
}

export interface LogSampleProps {
  rawLogSample: string[];
}

export interface TimeNavigationControlsProps {
  timeNavigation: 'preset' | 'pagination' | 'window' | 'segments';
  timeRangePreset: string;
  timeWindowSize: number;
  customTimeRange: { start?: Date; end?: Date };
  selectedSegment?: string;
  timeSegments: TimeSegment[];
  onTimeRangePresetChange: (preset: string) => void;
  onTimeWindowSizeChange: (size: number) => void;
  onNavigateTimeWindow: (direction: 'forward' | 'backward') => void;
  onNavigateTime: (direction: 'forward' | 'backward') => void;
  onSegmentChange?: (segmentId: string) => void;
  isProcessing: boolean;
}

export interface TimeSegment {
  id: string;
  startTime: Date;
  endTime: Date;
  data: any[];
}

export interface DataTimeRange {
  min: Date;
  max: Date;
  selected: {
    start: Date;
    end: Date;
  };
}

export interface TimeRangeSelectorProps {
  dataTimeRange: DataTimeRange;
  onTimeRangeChange: (range: { start: Date; end: Date }) => void;
  isProcessing: boolean;
}

export interface SegmentedPanelsProps {
  timeSegments: TimeSegment[];
  signals: Signal[];
  selectedSegment: string;
  onSegmentChange: (segmentId: string) => void;
  chartType: 'line' | 'bar';
  getPanelSignals: (panelId: string) => Signal[];
}

export const CHART_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F97316', // orange
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F43F5E', // rose
  '#6366F1', // indigo
  '#84CC16', // lime
  '#0EA5E9', // sky
];
