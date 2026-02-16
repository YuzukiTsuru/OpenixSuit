import i18n from '../i18n';

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
};
