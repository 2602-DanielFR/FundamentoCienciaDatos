export interface SavedFace {
    name: string;
    descriptor: number[];
    timestamp: string;
    emotions: any | null;
    imageData: string;
    lastDetection?: string;
}

export interface EmotionThresholds {
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
}

export interface DetectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type StatusType = 'loading' | 'success' | 'error';