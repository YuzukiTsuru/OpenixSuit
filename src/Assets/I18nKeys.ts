import i18n from '../i18n';

// 动态翻译键, 用于在运行时根据语言环境动态翻译文本,不会使用只是提供导出的键

export const DYNAMIC_I18N_KEYS = {
  flashMode: {
    partition: i18n.t('flashMode.partition'),
    keep_data: i18n.t('flashMode.keep_data'),
    partition_erase: i18n.t('flashMode.partition_erase'),
    full_erase: i18n.t('flashMode.full_erase'),
  },
  postFlashAction: {
    reboot: i18n.t('postFlashAction.reboot'),
    shutdown: i18n.t('postFlashAction.shutdown'),
    none: i18n.t('postFlashAction.none'),
  },
  flashManagerStages: {
    complete: i18n.t('flashManager.stages.complete'),
    downloadBoot: i18n.t('flashManager.stages.downloadBoot'),
    downloadUboot: i18n.t('flashManager.stages.downloadUboot'),
    fesFlash: i18n.t('flashManager.stages.fesFlash'),
    flashMbr: i18n.t('flashManager.stages.flashMbr'),
    flashPartitions: i18n.t('flashManager.stages.flashPartitions'),
    initDram: i18n.t('flashManager.stages.initDram'),
    loadImage: i18n.t('flashManager.stages.loadImage'),
    openDevice: i18n.t('flashManager.stages.openDevice'),
    prepareFes: i18n.t('flashManager.stages.prepareFes'),
    prepareFlash: i18n.t('flashManager.stages.prepareFlash'),
    queryBootMode: i18n.t('flashManager.stages.queryBootMode'),
    queryStorageInfo: i18n.t('flashManager.stages.queryStorageInfo'),
    sendEraseFlag: i18n.t('flashManager.stages.sendEraseFlag'),
    setDeviceMode: i18n.t('flashManager.stages.setDeviceMode'),
    waitReconnect: i18n.t('flashManager.stages.waitReconnect'),
  },
};
