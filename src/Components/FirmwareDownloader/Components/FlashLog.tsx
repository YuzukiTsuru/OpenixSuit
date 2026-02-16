import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../Types';
import { formatTime, getLogClassName, getLogLevelDisplay } from '../Utils';

interface FlashLogProps {
  logs: LogEntry[];
}

export const FlashLog: React.FC<FlashLogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="fd-section fd-section-log">
      <h3>烧录日志</h3>
      <div className="fd-log-container" ref={logContainerRef}>
        {logs.length === 0 ? (
          <div className="fd-empty-state">
            <span>暂无日志</span>
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={getLogClassName(log.level)}>
              <span className="log-time">[{formatTime(log.timestamp)}]</span>
              <span className="log-level">[{getLogLevelDisplay(log.level)}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
