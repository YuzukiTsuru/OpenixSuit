import React, { useState, useCallback, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { EfexContext, EfexDevice, EfexError } from '../../lib/libefex';
import { getChipName, formatChipId } from '../../Assets/chipIdToChipName';
import './EFEXGui.css';

export const EFEXGui: React.FC = () => {
  const [devices, setDevices] = useState<EfexDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<EfexDevice | null>(null);
  const [context, setContext] = useState<EfexContext | null>(null);
  const [scanning, setScanning] = useState(false);

  const [address, setAddress] = useState('0x00000000');
  const [length, setLength] = useState('256');
  const [memoryData, setMemoryData] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState(false);

  const [execAddress, setExecAddress] = useState('0x00000000');
  const [writeAddress, setWriteAddress] = useState('0x00000000');
  const [writeFilePath, setWriteFilePath] = useState<string | null>(null);
  const [initFilePath, setInitFilePath] = useState<string | null>(null);

  const [logs, setLogs] = useState<{ time: Date; level: string; message: string }[]>([]);
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
    }
  }, [selectedDevice]);

  const initContext = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const ctx = new EfexContext();
      await ctx.open();
      await ctx.refreshMode();
      setContext(ctx);
      addLog('OKAY', `已选择: ${getChipName(selectedDevice.chip_version)} [${ctx.modeStr}]`);
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      addLog('ERRO', `初始化失败: ${e.message}`);
      setContext(null);
    }
  }, [selectedDevice]);

  const addLog = useCallback((level: string, message: string) => {
    setLogs(prev => [...prev.slice(-200), { time: new Date(), level, message }]);
  }, []);

  const parseAddress = (addr: string): number | null => {
    try {
      const trimmed = addr.trim().toLowerCase();
      if (trimmed.startsWith('0x')) {
        return parseInt(trimmed.slice(2), 16);
      }
      return parseInt(trimmed, 10);
    } catch {
      return null;
    }
  };

  const handleScan = useCallback(async () => {
    setScanning(true);
    addLog('INFO', '正在扫描设备...');
    try {
      const foundDevices = await EfexContext.scanDevices();
      setDevices(foundDevices);
      setSelectedDevice(null);
      setContext(null);
      setMemoryData(null);
      if (foundDevices.length === 0) {
        addLog('WARN', '未发现设备');
      } else {
        addLog('OKAY', `发现 ${foundDevices.length} 个设备`);
      }
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      addLog('ERRO', `扫描失败: ${e.message}`);
    } finally {
      setScanning(false);
    }
  }, [addLog]);

  const handleReadMemory = useCallback(async () => {
    if (!context) {
      addLog('ERRO', '请先选择设备');
      return;
    }
    const addr = parseAddress(address);
    const len = parseAddress(length);
    if (addr === null || isNaN(addr)) {
      addLog('ERRO', '无效的地址');
      return;
    }
    if (len === null || isNaN(len) || len <= 0 || len > 65536) {
      addLog('ERRO', '无效的长度 (1-65536)');
      return;
    }
    setLoading(true);
    addLog('INFO', `读取内存: ${formatHex(addr)}, 长度: ${len}`);
    try {
      const data = await context.fel.read(addr, len);
      setMemoryData(data);
      addLog('OKAY', `读取成功: ${len} 字节`);
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      addLog('ERRO', `读取失败: ${e.message}`);
      setMemoryData(null);
    } finally {
      setLoading(false);
    }
  }, [context, address, length, addLog]);

  const handleWriteFile = useCallback(async () => {
    if (!context) {
      addLog('ERRO', '请先选择设备');
      return;
    }
    if (!writeFilePath) {
      addLog('ERRO', '请先选择文件');
      return;
    }
    const addr = parseAddress(writeAddress);
    if (addr === null || isNaN(addr)) {
      addLog('ERRO', '无效的地址');
      return;
    }
    setLoading(true);
    addLog('INFO', `写入文件到内存: ${formatHex(addr)}`);
    try {
      const fileData = await readFile(writeFilePath);
      await context.fel.write(addr, fileData);
      addLog('OKAY', `写入成功: ${fileData.length} 字节`);
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      addLog('ERRO', `写入失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [context, writeFilePath, writeAddress, addLog]);

  const handleSelectFile = useCallback(async () => {
    const selected = await open({ multiple: false, title: '选择要写入的文件' });
    if (selected) {
      setWriteFilePath(selected as string);
      addLog('INFO', `已选择文件: ${selected}`);
    }
  }, [addLog]);

  const handleSelectInitFile = useCallback(async () => {
    const selected = await open({ multiple: false, title: '选择初始化镜像', filters: [{ name: 'Image', extensions: ['img', 'bin'] }] });
    if (selected) {
      setInitFilePath(selected as string);
      addLog('INFO', `已选择镜像: ${selected}`);
    }
  }, [addLog]);

  const handleInitMemory = useCallback(async () => {
    if (!context) {
      addLog('ERRO', '请先选择设备');
      return;
    }
    if (!initFilePath) {
      addLog('ERRO', '请先选择镜像文件');
      return;
    }
    setLoading(true);
    addLog('INFO', '正在初始化内存...');
    try {
      const fileData = await readFile(initFilePath);
      const loadAddr = 0x44000000;
      await context.fel.write(loadAddr, fileData);
      addLog('INFO', `已加载镜像到 ${formatHex(loadAddr)}，正在执行...`);
      await context.fel.exec(loadAddr);
      addLog('OKAY', '初始化完成');
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      addLog('ERRO', `初始化失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [context, initFilePath, addLog]);

  const handleExec = useCallback(async () => {
    if (!context) {
      addLog('ERRO', '请先选择设备');
      return;
    }
    const addr = parseAddress(execAddress);
    if (addr === null || isNaN(addr)) {
      addLog('ERRO', '无效的地址');
      return;
    }
    setLoading(true);
    addLog('INFO', `跳转执行: ${formatHex(addr)}`);
    try {
      await context.fel.exec(addr);
      addLog('OKAY', '执行成功');
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      addLog('ERRO', `执行失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [context, execAddress, addLog]);

  const formatHex = (num: number): string => `0x${num.toString(16).toUpperCase().padStart(8, '0')}`;
  const formatTime = (date: Date): string => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const renderHexView = () => {
    if (!memoryData) return null;
    const rows: React.ReactElement[] = [];
    const baseAddr = parseAddress(address) || 0;
    for (let i = 0; i < memoryData.length; i += 16) {
      const rowAddr = baseAddr + i;
      const rowBytes = memoryData.slice(i, Math.min(i + 16, memoryData.length));
      const hexParts: string[] = [];
      const asciiParts: string[] = [];
      for (let j = 0; j < 16; j++) {
        if (j < rowBytes.length) {
          const byte = rowBytes[j];
          hexParts.push(byte.toString(16).toUpperCase().padStart(2, '0'));
          asciiParts.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
        } else {
          hexParts.push('  ');
          asciiParts.push(' ');
        }
        if (j === 7) hexParts.push('');
      }
      rows.push(
        <div key={i} className="hex-row">
          <span className="hex-addr">{formatHex(rowAddr)}</span>
          <span className="hex-bytes">{hexParts.join(' ')}</span>
          <span className="hex-ascii">{asciiParts.join('')}</span>
        </div>
      );
    }
    return <div className="hex-view">{rows}</div>;
  };

  const isReady = context !== null && context?.mode === 'fel';

  return (
    <div className="efex-gui">
      <div className="efex-sidebar">
        <div className="efex-section">
          <div className="section-header">设备选择</div>
          <div className="section-body">
            <button onClick={handleScan} disabled={scanning} className="efex-btn efex-btn-primary efex-btn-block">
              {scanning ? '扫描中...' : '扫描设备'}
            </button>
            <div className="efex-device-list">
              {devices.length === 0 ? (
                <div className="efex-empty">未发现设备</div>
              ) : (
                devices.map((device, index) => (
                  <div key={index} className={`efex-device-item ${selectedDevice === device ? 'selected' : ''}`} onClick={() => setSelectedDevice(device)}>
                    <div className="device-name">{getChipName(device.chip_version)}</div>
                    <div className="device-info">
                      <span>{formatChipId(device.chip_version)}</span>
                      <span className="device-mode">{device.mode_str}</span>
                      {selectedDevice === device && context && (
                        <span className="device-status">{isReady ? '就绪' : context?.modeStr}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="efex-section">
          <div className="section-header">内存读取</div>
          <div className="section-body">
            <div className="efex-form-group">
              <label>起始地址</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x00000000" disabled={!isReady || loading} />
            </div>
            <div className="efex-form-group">
              <label>读取长度</label>
              <input type="text" value={length} onChange={(e) => setLength(e.target.value)} placeholder="256" disabled={!isReady || loading} />
            </div>
            <button onClick={handleReadMemory} disabled={!isReady || loading} className="efex-btn efex-btn-primary efex-btn-block">
              {loading ? '读取中...' : '读取内存'}
            </button>
          </div>
        </div>

        <div className="efex-section">
          <div className="section-header">内存写入</div>
          <div className="section-body">
            <div className="efex-form-group">
              <label>目标地址</label>
              <input type="text" value={writeAddress} onChange={(e) => setWriteAddress(e.target.value)} placeholder="0x00000000" disabled={!isReady || loading} />
            </div>
            <div className="efex-form-group">
              <label>选择文件</label>
              <div className="efex-file-row">
                <input type="text" value={writeFilePath || ''} readOnly placeholder="选择文件..." disabled={!isReady || loading} />
                <button onClick={handleSelectFile} disabled={!isReady || loading} className="efex-btn efex-btn-small efex-btn-primary">浏览</button>
              </div>
            </div>
            <button onClick={handleWriteFile} disabled={!isReady || loading || !writeFilePath} className="efex-btn efex-btn-primary efex-btn-block">
              {loading ? '写入中...' : '写入内存'}
            </button>
          </div>
        </div>

        <div className="efex-section">
          <div className="section-header">初始化内存</div>
          <div className="section-body">
            <div className="efex-form-group">
              <label>镜像文件</label>
              <div className="efex-file-row">
                <input type="text" value={initFilePath || ''} readOnly placeholder="选择img/bin文件..." disabled={!isReady || loading} />
                <button onClick={handleSelectInitFile} disabled={!isReady || loading} className="efex-btn efex-btn-small efex-btn-primary">浏览</button>
              </div>
            </div>
            <button onClick={handleInitMemory} disabled={!isReady || loading || !initFilePath} className="efex-btn efex-btn-primary efex-btn-block">
              {loading ? '执行中...' : '运行'}
            </button>
          </div>
        </div>

        <div className="efex-section">
          <div className="section-header">跳转执行</div>
          <div className="section-body">
            <div className="efex-form-group">
              <label>入口地址</label>
              <input type="text" value={execAddress} onChange={(e) => setExecAddress(e.target.value)} placeholder="0x00000000" disabled={!isReady || loading} />
            </div>
            <button onClick={handleExec} disabled={!isReady || loading} className="efex-btn efex-btn-primary efex-btn-block">
              {loading ? '执行中...' : '跳转执行'}
            </button>
          </div>
        </div>
      </div>

      <div className="efex-main">
        <div className="efex-hex-container">
          <div className="section-header">内存视图</div>
          {memoryData ? renderHexView() : <div className="efex-empty-hex">读取内存后显示数据</div>}
        </div>

        <div className="efex-log-container">
          <div className="section-header">操作日志</div>
          <div className="efex-log" ref={logContainerRef}>
            {logs.length === 0 ? (
              <div className="efex-empty">暂无日志</div>
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
    </div>
  );
};

export default EFEXGui;
