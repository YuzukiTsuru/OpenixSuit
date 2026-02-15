import { FlashProgress } from '../Types';

export interface ProgressStage {
  id: string;
  name: string;
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

  addStage(id: string, name: string, weight: number): this {
    this.stages.push({ id, name, weight });
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
    this.emitProgress(this.stages[index].name, 0);
    return this;
  }

  updateStageProgress(progress: number, stageName?: string): this {
    this.currentStageProgress = Math.min(100, Math.max(0, progress));
    const currentStage = this.stages[this.currentStageIndex];
    const name = stageName || currentStage?.name || '';
    this.emitProgress(name, this.currentStageProgress);
    return this;
  }

  completeStage(stageName?: string): this {
    const currentStage = this.stages[this.currentStageIndex];
    const name = stageName || currentStage?.name || '';
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
      this.emitProgress(currentStage.name, 0);
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
  { id: 'prepare', name: '准备FES程序', weight: 2 },
  { id: 'init_dram', name: '初始化DRAM', weight: 40 },
  { id: 'download_uboot', name: '下载U-Boot', weight: 25 },
  { id: 'reconnect', name: '等待设备重连', weight: 20 },
  { id: 'ready', name: '准备烧录', weight: 3 },
];

export const FES_STAGES: ProgressStage[] = [
  { id: 'query_secure', name: '查询启动模式', weight: 2 },
  { id: 'erase_flag', name: '发送擦除标志', weight: 3 },
  { id: 'query_storage', name: '查询存储器信息', weight: 2 },
  { id: 'mbr', name: '烧录MBR', weight: 5 },
  { id: 'partitions', name: '烧录分区数据', weight: 80 },
  { id: 'boot', name: '下载Boot0/Boot1', weight: 5 },
  { id: 'set_mode', name: '设置设备状态', weight: 2 },
  { id: 'complete', name: '完成', weight: 1 },
];

export const FULL_FLASH_STAGES: ProgressStage[] = [
  { id: 'load_image', name: '加载镜像文件', weight: 3 },
  { id: 'open_device', name: '打开设备', weight: 2 },
  { id: 'fel_prepare', name: '准备FES程序', weight: 1 },
  { id: 'fel_init_dram', name: '初始化DRAM', weight: 20 },
  { id: 'fel_download_uboot', name: '下载U-Boot', weight: 12 },
  { id: 'fel_reconnect', name: '等待设备重连', weight: 10 },
  { id: 'fel_ready', name: '准备烧录', weight: 2 },
  { id: 'fes_flash', name: 'FES模式烧录', weight: 35 },
  { id: 'complete', name: '完成', weight: 5 },
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
