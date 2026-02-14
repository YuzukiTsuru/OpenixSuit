import React, { useEffect, useState } from 'react';
import './Popup.css';

export type PopupType = 'success' | 'error' | 'warning' | 'info';

interface PopupProps {
  visible: boolean;
  type?: PopupType;
  title?: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

export const Popup: React.FC<PopupProps> = ({
  visible,
  type = 'info',
  title,
  message,
  duration,
  onClose,
}) => {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
  }, [visible]);

  useEffect(() => {
    if (visible && duration && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const handleClose = () => {
    setShow(false);
    if (onClose) {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="popup-overlay" onClick={handleClose}>
      <div className={`popup popup-${type}`} onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <div className="popup-icon">
            {type === 'success' && '✓'}
            {type === 'error' && '✕'}
            {type === 'warning' && '!'}
            {type === 'info' && 'i'}
          </div>
          {title && <div className="popup-title">{title}</div>}
          <button className="popup-close" onClick={handleClose}>✕</button>
        </div>
        {message && <div className="popup-message">{message}</div>}
      </div>
    </div>
  );
};

export default Popup;
