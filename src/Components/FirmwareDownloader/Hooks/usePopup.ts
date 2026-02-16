import { useState, useCallback } from 'react';
import { PopupState, PopupType } from '../../../CoreUI';

export function usePopup() {
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showPopup = useCallback((type: PopupType, title: string, message: string) => {
    setPopup({
      visible: true,
      type,
      title,
      message,
    });
  }, []);

  const hidePopup = useCallback(() => {
    setPopup(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    popup,
    showPopup,
    hidePopup,
  };
}
