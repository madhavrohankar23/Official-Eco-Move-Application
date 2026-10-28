export interface TransferInfo {
  isTransferring: boolean;
  stationName: string;
  deboardMode: "walk" | "bus" | "metro" | "drive";
  deboardText: string;
  boardMode: "walk" | "bus" | "metro" | "drive";
  boardText: string;
  nextDestination: string;
}

export interface FlyThroughState {
  isActive: boolean;
  isPlaying: boolean;
  isFinished?: boolean | undefined;
  progress: number; // 0 to 1
  speed: 1 | 2 | 4;
  currentLegIndex: number;
  totalLegs: number;
  mode: "walk" | "bus" | "metro" | "drive";
  lineName: string;
  headline: string;
  subline: string;
  co2SavedKg: number;
  fromName: string;
  toName: string;
  elapsedTimeMin?: number | undefined;
  totalTimeMin?: number | undefined;
  transferInfo?: TransferInfo | null | undefined;
  activeTbtStepIndex?: number | undefined;
  distanceToNextTbtStepM?: number | undefined;
}

export interface PreviewStep {
  id: string;
  instruction: string;
  subInstruction: string;
  distanceM: number;
  cumDistanceStartM: number;
  cumDistanceEndM: number;
  location: { lat: number; lon: number };
  mode: string;
}
export interface PreviewStatus {
  active: boolean;
  playing: boolean;
  speed: 1 | 2 | 4;
  state: Partial<FlyThroughState>;
}
