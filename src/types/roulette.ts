export type RouletteColor = 'red' | 'black' | 'green';

export interface RouletteNumberMeta {
  number: number;
  color: RouletteColor;
  dozen: 1 | 2 | 3 | 0; // 0 for zero
  column: 1 | 2 | 3 | 0; // 0 for zero
  isEven: boolean | null;
  isHigh: boolean | null; // 19-36
  sector: 'voisins' | 'tiers' | 'orphelins' | 'zero_spiel';
  wheelIndex: number;
}

export interface SpinRecord {
  id: string;
  number: number;
  color: RouletteColor;
  timestamp: number;
  tableSource: string;
  predicted?: boolean;
  betWon?: boolean;
  profit?: number;
  source?: 'app' | 'telegram' | 'wheel' | 'stream';
  telegramSender?: string;
}

export type StrategyTier =
  | 'low_cap_single_row' // Sniper 1 แถว: ทุนต่ำเพียง 1 ชิป กำไร +200% (จ่าย 1:2)
  | 'quantum_core_10' // เลขเด่น 10 ตัว 100 ปัจจัย: ทุน 10 ชิป ชนะรับ 36 เท่า กำไร +260% ความตรงกัน >98%
  | 'low_cap_dual_row' // ดัก 2 แถว: ทุน 2 ชิป ชนะ 67.5% - 98% กำไร +50%
  | 'row_street_booster' // แถว + สตรีทบูสเตอร์: ทุน 2 ชิป กำไรสูงสุด 11 เท่า
  | 'ultra_safe_98' // คลุม 36 ช่อง
  | 'quantum_matrix_98' // คลุม 35 ช่อง
  | 'sector_trap_97'; // ดักโซนฟิสิกส์

export interface QuantumFactorItem {
  id: number;
  nameThai: string;
  categoryThai: string;
  weight: number; // 0 - 100
  status: 'active' | 'peak' | 'normal';
  valueDisplay: string;
}

export interface FactorPillarGroup {
  pillarId: number;
  pillarName: string;
  pillarDescription: string;
  averageScore: number;
  factors: QuantumFactorItem[];
}

export interface ProminentNumber10 {
  rank: number; // 1 to 10
  number: number;
  color: RouletteColor;
  concordanceScore: number; // e.g. 98.6 (%)
  sector: string;
  dozen: number;
  column: number;
  sleeper: number;
  topFactorReason: string;
  chipsToBet: number;
  expectedPayout: number; // in THB
  netProfit: number; // in THB
}

export interface HundredFactorsEngineResult {
  prominent10: ProminentNumber10[];
  overallConcordance: number; // e.g. 98.4%
  pillars: FactorPillarGroup[];
  totalFactorsCount: number; // 100
  activeFactorsCount: number;
  highestConfidenceNumber: number;
  recommendedTotalBet: number;
  netProfitIfHit: number;
  roiPercentage: number; // 260%
}

export interface RowColumnStats {
  row1Sleeper: number;
  row2Sleeper: number;
  row3Sleeper: number;
  row1Count: number;
  row2Count: number;
  row3Count: number;
  row1Percentage: number;
  row2Percentage: number;
  row3Percentage: number;
  dozen1Sleeper: number;
  dozen2Sleeper: number;
  dozen3Sleeper: number;
  dozen1Percentage: number;
  dozen2Percentage: number;
  dozen3Percentage: number;
  recommendedTarget: 'row1' | 'row2' | 'row3' | 'dozen1' | 'dozen2' | 'dozen3';
  targetLabel: string;
  targetReason: string;
  targetNumbers: number[];
  roiPercentage: number; // e.g. 200 (for 2:1 payout)
}
export interface BetInstruction {
  type: 'straight' | 'split' | 'street' | 'corner' | 'line' | 'dozen' | 'column' | 'outside';
  targets: number[] | string;
  chips: number;
  payoutMultiplier: number;
  coverageCount: number;
  label: string;
}

export interface ProgressionStep {
  currentStep: number; // 1, 2, or 3
  stepChips: number; // chips for current step (e.g. 1, 2, 4)
  stepStakeAmount: number; // in THB
  expectedNetGain: number; // net profit in THB after recovering previous losses
  isRecoveryActive: boolean;
  consecutiveLosses: number;
}

export interface PredictionResult {
  strategyId: StrategyTier;
  strategyName: string;
  winProbability: number; // e.g. 0.984 (98.4%)
  riskLevel: 'Ultra-Low (ความเสี่ยงต่ำมาก)' | 'Low (ความเสี่ยงต่ำ)' | 'Moderate (ปานกลาง)';
  coveredNumbers: number[];
  uncoveredNumbers: number[];
  betInstructions: BetInstruction[];
  totalUnitsBet: number;
  expectedNetWinUnits: number;
  expectedLossUnits: number;
  hedgingSteps: string[];
  markovNextTopPicks: { number: number; probability: number }[];
  recommendedUnitStake: number; // in currency units based on bankroll
  confidenceScore: number; // 0 - 100
  reasoningThai: string;
  progression?: ProgressionStep;
}

export interface TableSourceInfo {
  id: string;
  name: string;
  casinoName: string;
  location: string;
  type: 'European' | 'French VIP' | 'Lightning' | 'Speed';
  totalSpins: number;
  lastUpdated: string;
  biasConfidence: number;
}

export interface BankrollConfig {
  initialCapital: number;
  currentCapital: number;
  baseUnit: number;
  stopLossLimit: number;
  takeProfitTarget: number;
  kellyFraction: number; // e.g. 0.25 (quarter Kelly)
  currency: string;
}

export interface TelegramPublicConfig {
  hasToken: boolean;
  hasEnvToken?: boolean;
  maskedToken: string;
  chatId: string;
  botUsername: string;
  chatTitle: string;
  isConnected: boolean;
  pollingActive: boolean;
  receiverMode?: 'webhook' | 'polling';
  webhookActive?: boolean;
  autoBroadcastOnAppSpin: boolean;
  autoBroadcastOnTelegramSpin: boolean;
  includeFullStatsInBroadcast: boolean;
  lastError: string | null;
  lastSyncAt: number | null;
  webhookUrl: string;
}

export interface TelegramDetectedChat {
  chatId: string;
  title: string;
  type: 'group' | 'supergroup' | 'channel' | 'private';
  lastMessageText: string;
  lastSender: string;
  timestamp: number;
}

export interface TelegramLogEntry {
  id: string;
  direction: 'outgoing' | 'incoming' | 'system';
  eventType: 'broadcast_prediction' | 'custom_message' | 'spin_received' | 'command_received' | 'error';
  text: string;
  chatId?: string;
  senderName?: string;
  parsedNumber?: number;
  timestamp: number;
  success: boolean;
}

export interface ServerAppStatePayload {
  spins: SpinRecord[];
  selectedStrategy: StrategyTier;
  currentStep: number;
  consecutiveLosses: number;
  stopLossNotice: string | null;
  bankrollConfig: BankrollConfig;
  currentTableId: string;
  telegramConfig: TelegramPublicConfig;
  telegramLogs: TelegramLogEntry[];
}

