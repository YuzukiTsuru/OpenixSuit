import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { EfexContext, EfexDevice, EfexError } from '../../Library/libEFEX';
import { getChipName, formatChipId } from '../../Assets/ChipIdToChipName';
import { initDRAM } from '../../Devices';
import { OpenixPacker, getFes } from '../../Library/OpenixIMG';
import { Popup, PopupType, PopupState } from '../../CoreUI';
import { HexView } from './HexView';
import { DisasmArch, DisasmInstruction, DisasmResult, LogEntry } from './Types';
import { formatHex, formatTime, parseAddress } from './Utils';
import './EFELGui.css';

export const EFELGui: React.FC = () => {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<EfexDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<EfexDevice | null>(null);
  const [context, setContext] = useState<EfexContext | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const [address, setAddress] = useState('0x00000000');
  const [length, setLength] = useState('256');
  const [memoryData, setMemoryData] = useState<Uint8Array | null>(null);
  const [memoryBaseAddr, setMemoryBaseAddr] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [disasmArch, setDisasmArch] = useState<DisasmArch>('off');
  const [disasmResult, setDisasmResult] = useState<DisasmInstruction[]>([]);

  const [execAddress, setExecAddress] = useState('0x00000000');
  const [writeAddress, setWriteAddress] = useState('0x00000000');
  const [writeFilePath, setWriteFilePath] = useState<string | null>(null);
  const [initFilePath, setInitFilePath] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (selectedDevice) {
      initContext();
    } else {
      setContext(null);
      setMemoryData(null);
      setIsTimeout(false);
    }
  }, [selectedDevice]);

  const addLog = useCallback((level: string, message: string) => {
    setLogs(prev => [...prev.slice(-200), { time: new Date(), level, message }]);
  }, []);

  useEffect(() => {
    if (!memoryData) return;

    if (disasmArch === 'off') {
      setDisasmResult([]);
      return;
    }

    const runDisasm = async () => {
      try {
        const result = await invoke<DisasmResult>('disassemble', {
          data: Array.from(memoryData),
          address: memoryBaseAddr,
          arch: disasmArch,
        });

        if (result.error) {
          addLog('WARN', t('efelGui.logMessages.disasmWarning', { error: result.error }));
        } else {
          setDisasmResult(result.instructions);
        }
      } catch (e) {
        addLog('WARN', t('efelGui.logMessages.disasmFailed', { error: String(e) }));
      }
    };

    runDisasm();
  }, [disasmArch, memoryData, memoryBaseAddr, addLog, t]);

  const showPopup = useCallback((type: PopupType, title: string, message: string) => {
    setPopup({
      visible: true,
      type,
      title,
      message,
    });
  }, []);

  const handleStatusClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTimeout) {
      showPopup('error', t('efelGui.popup.timeoutTitle'), t('efelGui.popup.timeoutMsg'));
    } else if (context && context.mode !== 'fel') {
      showPopup('warning', t('efelGui.popup.unsupportedTitle'), t('efelGui.popup.unsupportedMsg', { mode: context.modeStr }));
    }
  }, [isTimeout, context, showPopup, t]);

  const initContext = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const ctx = new EfexContext();
      await ctx.open();
      await ctx.refreshMode();
      setContext(ctx);
      setIsTimeout(false);
      addLog('OKAY', t('efelGui.logMessages.selected', { name: getChipName(selectedDevice.chip_version), mode: ctx.modeStr }));
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      addLog('ERRO', t('efelGui.logMessages.initFailed', { error: e.message }));
      setContext(null);
      if (err instanceof EfexError && err.isTimeout()) {
        setIsTimeout(true);
        showPopup('error', t('efelGui.popup.timeoutTitle'), t('efelGui.popup.initTimeoutMsg'));
      }
    }
  }, [selectedDevice, addLog, showPopup, t]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    addLog('INFO', t('efelGui.logMessages.scanning'));
    try {
      const foundDevices = await EfexContext.scanDevices();
      setDevices(foundDevices);
      setSelectedDevice(null);
      setContext(null);
      setMemoryData(null);
      if (foundDevices.length === 0) {
        addLog('WARN', t('efelGui.logMessages.noDeviceFound'));
      } else {
        addLog('OKAY', t('efelGui.logMessages.devicesFound', { count: foundDevices.length }));
      }
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      setIsTimeout(e instanceof EfexError && e.isTimeout());
      addLog('ERRO', t('efelGui.logMessages.scanFailed', { error: e.message }));
      if (e instanceof EfexError && e.isTimeout()) {
        showPopup('error', t('efelGui.popup.timeoutTitle'), t('efelGui.popup.scanTimeoutMsg'));
      }
    } finally {
      setScanning(false);
    }
  }, [addLog, showPopup, t]);

  const handleReadMemory = useCallback(async () => {
    if (!context) {
      addLog('ERRO', t('efelGui.logMessages.selectDeviceFirst'));
      return;
    }
    const addr = parseAddress(address);
    const len = parseAddress(length);
    if (addr === null || isNaN(addr)) {
      addLog('ERRO', t('efelGui.logMessages.invalidAddress'));
      return;
    }
    if (len === null || isNaN(len) || len <= 0 || len > 65536) {
      addLog('ERRO', t('efelGui.logMessages.invalidLength'));
      return;
    }
    setLoading(true);
    addLog('INFO', t('efelGui.logMessages.readMemory', { addr: formatHex(addr), len }));
    try {
      const data = await context.fel.read(addr, len);
      setMemoryData(data);
      setMemoryBaseAddr(addr);
      addLog('OKAY', t('efelGui.logMessages.readSuccess', { len }));
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      setIsTimeout(e instanceof EfexError && e.isTimeout());
      addLog('ERRO', t('efelGui.logMessages.readFailed', { error: e.message }));
      setMemoryData(null);
    } finally {
      setLoading(false);
    }
  }, [context, address, length, addLog, t]);

  const handleSaveMemory = useCallback(async () => {
    if (!memoryData) {
      addLog('ERRO', t('efelGui.logMessages.noDataToSave'));
      return;
    }
    const filePath = await save({
      title: t('efelGui.memoryRead.saveTitle'),
      defaultPath: `memory_${address.replace('0x', '')}.bin`,
      filters: [{ name: 'Binary', extensions: ['bin'] }],
    });
    if (!filePath) return;
    try {
      await writeFile(filePath, memoryData);
      addLog('OKAY', t('efelGui.logMessages.savedTo', { path: filePath }));
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      addLog('ERRO', t('efelGui.logMessages.saveFailed', { error: e.message }));
    }
  }, [memoryData, address, addLog, t]);

  const handleWriteFile = useCallback(async () => {
    if (!context) {
      addLog('ERRO', t('efelGui.logMessages.selectDeviceFirst'));
      return;
    }
    if (!writeFilePath) {
      addLog('ERRO', t('efelGui.logMessages.selectFileFirst'));
      return;
    }
    const addr = parseAddress(writeAddress);
    if (addr === null || isNaN(addr)) {
      addLog('ERRO', t('efelGui.logMessages.invalidAddress'));
      return;
    }
    setLoading(true);
    addLog('INFO', t('efelGui.logMessages.writeFileToMemory', { addr: formatHex(addr) }));
    try {
      const fileData = await readFile(writeFilePath);
      await context.fel.write(addr, fileData);
      addLog('OKAY', t('efelGui.logMessages.writeSuccess', { len: fileData.length }));
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      setIsTimeout(e instanceof EfexError && e.isTimeout());
      addLog('ERRO', t('efelGui.logMessages.writeFailed', { error: e.message }));
    } finally {
      setLoading(false);
    }
  }, [context, writeFilePath, writeAddress, addLog, t]);

  const handleSelectFile = useCallback(async () => {
    const selected = await open({ multiple: false, title: t('efelGui.memoryWrite.selectFile') });
    if (selected) {
      setWriteFilePath(selected as string);
      addLog('INFO', t('efelGui.logMessages.fileSelected', { path: selected }));
    }
  }, [addLog, t]);

  const handleSelectInitFile = useCallback(async () => {
    const selected = await open({ multiple: false, title: t('efelGui.initMemory.imageFile'), filters: [{ name: 'Image', extensions: ['img', 'bin'] }] });
    if (selected) {
      setInitFilePath(selected as string);
      addLog('INFO', t('efelGui.logMessages.imageSelected', { path: selected }));
    }
  }, [addLog, t]);

  const handleInitMemory = useCallback(async () => {
    if (!context) {
      addLog('ERRO', t('efelGui.logMessages.selectDeviceFirst'));
      return;
    }
    if (!initFilePath) {
      addLog('ERRO', t('efelGui.logMessages.selectImageFirst'));
      return;
    }
    setLoading(true);
    addLog('INFO', t('efelGui.logMessages.initMemory'));
    try {
      const packer = new OpenixPacker();
      const success = await packer.loadImageFromPath(initFilePath);
      if (!success) {
        addLog('ERRO', t('efelGui.logMessages.loadImageFailed'));
        return;
      }

      const fesData = await getFes(packer);
      if (!fesData) {
        addLog('ERRO', t('efelGui.logMessages.fesNotFound'));
        return;
      }

      const result = await initDRAM(context, fesData, {
        onLog: (level: 'info' | 'warn' | 'error', msg: string) => addLog(level.toUpperCase().slice(0, 4), msg),
        onProgress: (stage: string) => addLog('INFO', stage),
      });

      if (!result.success) {
        addLog('ERRO', t('efelGui.logMessages.dramInitFailed'));
        return;
      }
      addLog('OKAY', t('efelGui.logMessages.initComplete'));
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      setIsTimeout(e instanceof EfexError && e.isTimeout());
      addLog('ERRO', t('efelGui.logMessages.initFailed', { error: e.message }));
    } finally {
      setLoading(false);
    }
  }, [context, initFilePath, addLog, t]);

  const handleExec = useCallback(async () => {
    if (!context) {
      addLog('ERRO', t('efelGui.logMessages.selectDeviceFirst'));
      return;
    }
    const addr = parseAddress(execAddress);
    if (addr === null || isNaN(addr)) {
      addLog('ERRO', t('efelGui.logMessages.invalidAddress'));
      return;
    }
    setLoading(true);
    addLog('INFO', t('efelGui.logMessages.execJump', { addr: formatHex(addr) }));
    try {
      await context.fel.exec(addr);
      addLog('OKAY', t('efelGui.logMessages.execSuccess'));
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      setIsTimeout(e instanceof EfexError && e.isTimeout());
      addLog('ERRO', t('efelGui.logMessages.execFailed', { error: e.message }));
    } finally {
      setLoading(false);
    }
  }, [context, execAddress, addLog, t]);

  const isReady = context !== null && context?.mode === 'fel';

  const getDeviceStatusClassName = () => {
    const classes = ['device-status'];
    if (isTimeout) classes.push('status-timeout');
    if (context && context.mode !== 'fel') classes.push('status-unsupported');
    if (isTimeout || (context && context.mode !== 'fel')) classes.push('status-clickable');
    return classes.join(' ');
  };

  const getDeviceStatusText = () => {
    if (isTimeout) return t('efelGui.status.timeout');
    if (context && isReady) return t('efelGui.status.ready');
    if (context && context.mode !== 'fel') return t('efelGui.status.unsupported');
    return context?.modeStr || t('efelGui.status.connecting');
  };

  return (
    <div className="efex-gui">
      <div className="efex-sidebar">
        <div className="efex-section">
          <div className="section-header">{t('efelGui.deviceSelect')}</div>
          <div className="section-body">
            <button onClick={handleScan} disabled={scanning} className="efex-btn efex-btn-primary efex-btn-block">
              {scanning ? t('common.scanning') : t('efelGui.scanDevice')}
            </button>
            <div className="efex-device-list">
              {devices.length === 0 ? (
                <div className="efex-empty">{t('efelGui.noDevice')}</div>
              ) : (
                devices.map((device, index) => (
                  <div key={index} className={`efex-device-item ${selectedDevice === device ? 'selected' : ''}`} onClick={() => setSelectedDevice(device)}>
                    <div className="device-name">{getChipName(device.chip_version)}</div>
                    <div className="device-info">
                      <span>{formatChipId(device.chip_version)}</span>
                      <span className="device-mode">{device.mode_str}</span>
                      {selectedDevice === device && (
                        <span className={getDeviceStatusClassName()} onClick={handleStatusClick}>
                          {getDeviceStatusText()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="efex-section">
          <div className="section-header">{t('efelGui.memoryRead.title')}</div>
          <div className="section-body">
            <div className="efex-form-group">
              <label>{t('efelGui.memoryRead.startAddr')}</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x00000000" disabled={!isReady || loading} />
            </div>
            <div className="efex-form-group">
              <label>{t('efelGui.memoryRead.readLength')}</label>
              <input type="text" value={length} onChange={(e) => setLength(e.target.value)} placeholder="256" disabled={!isReady || loading} />
            </div>
            <div className="efex-btn-row">
              <button onClick={handleReadMemory} disabled={!isReady || loading} className="efex-btn efex-btn-primary efex-btn-flex-3">
                {loading ? t('efelGui.memoryRead.reading') : t('efelGui.memoryRead.readMemory')}
              </button>
              <button onClick={handleSaveMemory} disabled={!memoryData} className="efex-btn efex-btn-primary efex-btn-flex-1">
                {t('efelGui.memoryRead.save')}
              </button>
            </div>
          </div>
        </div>

        <div className="efex-section">
          <div className="section-header">{t('efelGui.memoryWrite.title')}</div>
          <div className="section-body">
            <div className="efex-form-group">
              <label>{t('efelGui.memoryWrite.targetAddr')}</label>
              <input type="text" value={writeAddress} onChange={(e) => setWriteAddress(e.target.value)} placeholder="0x00000000" disabled={!isReady || loading} />
            </div>
            <div className="efex-form-group">
              <label>{t('efelGui.memoryWrite.selectFile')}</label>
              <div className="efex-file-row">
                <input type="text" value={writeFilePath || ''} readOnly placeholder={t('efelGui.memoryWrite.selectFilePlaceholder')} disabled={!isReady || loading} />
                <button onClick={handleSelectFile} disabled={!isReady || loading} className="efex-btn efex-btn-small efex-btn-primary">{t('common.browse')}</button>
              </div>
            </div>
            <button onClick={handleWriteFile} disabled={!isReady || loading || !writeFilePath} className="efex-btn efex-btn-primary efex-btn-block">
              {loading ? t('efelGui.memoryWrite.writing') : t('efelGui.memoryWrite.writeMemory')}
            </button>
          </div>
        </div>

        <div className="efex-section">
          <div className="section-header">{t('efelGui.initMemory.title')}</div>
          <div className="section-body">
            <div className="efex-form-group">
              <label>{t('efelGui.initMemory.imageFile')}</label>
              <div className="efex-file-row">
                <input type="text" value={initFilePath || ''} readOnly placeholder={t('efelGui.initMemory.selectImagePlaceholder')} disabled={!isReady || loading} />
                <button onClick={handleSelectInitFile} disabled={!isReady || loading} className="efex-btn efex-btn-small efex-btn-primary">{t('common.browse')}</button>
              </div>
            </div>
            <button onClick={handleInitMemory} disabled={!isReady || loading || !initFilePath} className="efex-btn efex-btn-primary efex-btn-block">
              {loading ? t('efelGui.initMemory.running') : t('common.run')}
            </button>
          </div>
        </div>

        <div className="efex-section">
          <div className="section-header">{t('efelGui.execJump.title')}</div>
          <div className="section-body">
            <div className="efex-form-group">
              <label>{t('efelGui.execJump.entryAddr')}</label>
              <input type="text" value={execAddress} onChange={(e) => setExecAddress(e.target.value)} placeholder="0x00000000" disabled={!isReady || loading} />
            </div>
            <button onClick={handleExec} disabled={!isReady || loading} className="efex-btn efex-btn-primary efex-btn-block">
              {loading ? t('efelGui.execJump.executing') : t('efelGui.execJump.exec')}
            </button>
          </div>
        </div>
      </div>

      <div className="efex-main">
        {memoryData ? (
          <HexView
            memoryData={memoryData}
            memoryBaseAddr={memoryBaseAddr}
            disasmArch={disasmArch}
            disasmResult={disasmResult}
            onArchChange={setDisasmArch}
          />
        ) : (
          <div className="efex-hex-container">
            <div className="section-header hex-header">
              <span>{t('efelGui.memoryView.title')}</span>
              <div className="hex-header-controls">
                <span className="hex-header-label">{t('efelGui.memoryView.disasm')}</span>
                <select
                  value={disasmArch}
                  onChange={(e) => setDisasmArch(e.target.value as DisasmArch)}
                  className="efex-select efex-select-inline"
                  disabled
                >
                  <option value="off">{t('efelGui.memoryView.off')}</option>
                </select>
              </div>
            </div>
            <div className="efex-empty-hex">{t('efelGui.memoryView.placeholder')}</div>
          </div>
        )}

        <div className="efex-log-container">
          <div className="section-header">{t('efelGui.log.title')}</div>
          <div className="efex-log" ref={logContainerRef}>
            {logs.length === 0 ? (
              <div className="efex-empty">{t('efelGui.log.noLog')}</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`efex-log-entry log-${log.level.toLowerCase()}`}>
                  <span className="log-time">[{formatTime(log.time)}]</span>
                  <span className="log-level">[{log.level}]</span>
                  <span className="log-msg">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Popup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default EFELGui;
