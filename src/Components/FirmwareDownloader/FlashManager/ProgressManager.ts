import { FlashProgress } from '../Types';
import i18n from '../../../i18n';

export interface ProgressStage {
  id: string;
  nameKey: string;
  weight: number;
}

export interface StageProgress {
  stage: string;
  percent: number;
}

type ProgressCallback = (progress: FlashProgress) => void;

export class ProgressManager {
  private stages: ProgressStage[] = [];
  private currentStageIndex: number = 0;
  private currentStageProgress: number = 0;
  private callback: ProgressCallback;
  private totalWeight: number = 0;
  private extraInfo: Partial<FlashProgress> = {};

  constructor(callback: ProgressCallback) {
    this.callback = callback;
  }

  defineStages(stages: ProgressStage[]): this {
    this.stages = stages;
    this.totalWeight = stages.reduce((sum, s) => sum + s.weight, 0);
    return this;
  }

  addStage(id: string, nameKey: string, weight: number): this {
    this.stages.push({ id, nameKey, weight });
    this.totalWeight += weight;
    return this;
  }

  setExtraInfo(info: Partial<FlashProgress>): this {
    this.extraInfo = { ...this.extraInfo, ...info };
    return this;
  }

  clearExtraInfo(): this {
    this.extraInfo = {};
    return this;
  }

  startStage(stageId: string): this {
    const index = this.stages.findIndex(s => s.id === stageId);
    if (index === -1) {
      console.warn(`Stage ${stageId} not found`);
      return this;
    }
    this.currentStageIndex = index;
    this.currentStageProgress = 0;
    this.emitProgress(i18n.t(this.stages[index].nameKey), 0);
    return this;
  }

  updateStageProgress(progress: number, stageName?: string): this {
    this.currentStageProgress = Math.min(100, Math.max(0, progress));
    const currentStage = this.stages[this.currentStageIndex];
    const name = stageName || (currentStage ? i18n.t(currentStage.nameKey) : '');
    this.emitProgress(name, this.currentStageProgress);
    return this;
  }

  completeStage(stageName?: string): this {
    const currentStage = this.stages[this.currentStageIndex];
    const name = stageName || (currentStage ? i18n.t(currentStage.nameKey) : '');
    this.currentStageProgress = 100;
    this.emitProgress(name, 100);
    return this;
  }

  nextStage(stageId?: string): this {
    if (stageId) {
      const index = this.stages.findIndex(s => s.id === stageId);
      if (index !== -1) {
        this.currentStageIndex = index;
      }
    } else {
      this.currentStageIndex++;
    }
    this.currentStageProgress = 0;
    const currentStage = this.stages[this.currentStageIndex];
    if (currentStage) {
      this.emitProgress(i18n.t(currentStage.nameKey), 0);
    }
    return this;
  }

  getOverallPercent(): number {
    let completedWeight = 0;

    for (let i = 0; i < this.currentStageIndex; i++) {
      completedWeight += this.stages[i].weight;
    }

    const currentStage = this.stages[this.currentStageIndex];
    if (currentStage) {
      completedWeight += currentStage.weight * (this.currentStageProgress / 100);
    }

    return (completedWeight / this.totalWeight) * 100;
  }

  private emitProgress(stage: string, _localProgress: number): void {
    const percent = this.getOverallPercent();
    this.callback({
      percent: Math.round(percent * 100) / 100,
      stage,
      ...this.extraInfo,
    });
  }

  createSubProgressCallback(weightRatio: number = 1): (progress: StageProgress) => void {
    return (progress: StageProgress) => {
      this.updateStageProgress(progress.percent * weightRatio, progress.stage);
    };
  }

  getStagePercent(stageId: string): number {
    const index = this.stages.findIndex(s => s.id === stageId);
    if (index === -1) return 0;
    if (index < this.currentStageIndex) return 100;
    if (index > this.currentStageIndex) return 0;
    return this.currentStageProgress;
  }

  reset(): this {
    this.currentStageIndex = 0;
    this.currentStageProgress = 0;
    this.extraInfo = {};
    return this;
  }

  getCurrentStage(): ProgressStage | undefined {
    return this.stages[this.currentStageIndex];
  }

  getStages(): ProgressStage[] {
    return [...this.stages];
  }
}

export const FEL_STAGES: ProgressStage[] = [
  { id: 'prepare', nameKey: 'flashManager.stages.prepareFes', weight: 2 },
  { id: 'init_dram', nameKey: 'flashManager.stages.initDram', weight: 40 },
  { id: 'download_uboot', nameKey: 'flashManager.stages.downloadUboot', weight: 25 },
  { id: 'reconnect', nameKey: 'flashManager.stages.waitReconnect', weight: 20 },
  { id: 'ready', nameKey: 'flashManager.stages.prepareFlash', weight: 3 },
];

export const FES_STAGES: ProgressStage[] = [
  { id: 'query_secure', nameKey: 'flashManager.stages.queryBootMode', weight: 2 },
  { id: 'erase_flag', nameKey: 'flashManager.stages.sendEraseFlag', weight: 3 },
  { id: 'query_storage', nameKey: 'flashManager.stages.queryStorageInfo', weight: 2 },
  { id: 'mbr', nameKey: 'flashManager.stages.flashMbr', weight: 5 },
  { id: 'partitions', nameKey: 'flashManager.stages.flashPartitions', weight: 80 },
  { id: 'boot', nameKey: 'flashManager.stages.downloadBoot', weight: 5 },
  { id: 'set_mode', nameKey: 'flashManager.stages.setDeviceMode', weight: 2 },
  { id: 'complete', nameKey: 'flashManager.stages.complete', weight: 1 },
];

export const FULL_FLASH_STAGES: ProgressStage[] = [
  { id: 'load_image', nameKey: 'flashManager.stages.loadImage', weight: 3 },
  { id: 'open_device', nameKey: 'flashManager.stages.openDevice', weight: 2 },
  { id: 'fel_prepare', nameKey: 'flashManager.stages.prepareFes', weight: 1 },
  { id: 'fel_init_dram', nameKey: 'flashManager.stages.initDram', weight: 20 },
  { id: 'fel_download_uboot', nameKey: 'flashManager.stages.downloadUboot', weight: 12 },
  { id: 'fel_reconnect', nameKey: 'flashManager.stages.waitReconnect', weight: 10 },
  { id: 'fel_ready', nameKey: 'flashManager.stages.prepareFlash', weight: 2 },
  { id: 'fes_flash', nameKey: 'flashManager.stages.fesFlash', weight: 35 },
  { id: 'complete', nameKey: 'flashManager.stages.complete', weight: 5 },
];

export function createFullFlashProgressManager(callback: ProgressCallback): ProgressManager {
  return new ProgressManager(callback).defineStages(FULL_FLASH_STAGES);
}

export function createFesProgressManager(callback: ProgressCallback): ProgressManager {
  return new ProgressManager(callback).defineStages(FES_STAGES);
}

export function createFelProgressManager(callback: ProgressCallback): ProgressManager {
  return new ProgressManager(callback).defineStages(FEL_STAGES);
}
