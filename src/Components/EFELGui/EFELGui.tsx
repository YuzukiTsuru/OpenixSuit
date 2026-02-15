import React, { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { EfexContext, EfexDevice, EfexError } from '../../Library/libEFEX';
import { getChipName, formatChipId } from '../../Assets/ChipIdToChipName';
import { initDRAM } from '../../Devices';
import { OpenixPacker, getFes } from '../../Library/OpenixIMG';
import { Popup, PopupType } from '../../CoreUI';
import './EFELGui.css';

type DisasmArch =
  | 'off'
  | 'arm'
  | 'arm_thumb'
  | 'arm64'
  | 'x86'
  | 'x86_64'
  | 'mips'
  | 'mips64'
  | 'ppc'
  | 'ppc64'
  | 'risc_v32'
  | 'risc_v64'
  | 'sparc'
  | 'system_z';

interface DisasmInstruction {
  address: number;
  size: number;
  bytes: number[];
  mnemonic: string;
  op_str: string;
}

interface DisasmResult {
  instructions: DisasmInstruction[];
  error: string | null;
}

const ARCH_OPTIONS: { value: DisasmArch; label: string }[] = [
  { value: 'off', label: '关闭' },
  { value: 'arm', label: 'ARM' },
  { value: 'arm_thumb', label: 'ARM Thumb' },
  { value: 'arm64', label: 'ARM64' },
  { value: 'x86', label: 'x86' },
  { value: 'x86_64', label: 'x86-64' },
  { value: 'mips', label: 'MIPS' },
  { value: 'mips64', label: 'MIPS64' },
  { value: 'ppc', label: 'PPC' },
  { value: 'ppc64', label: 'PPC64' },
  { value: 'risc_v32', label: 'RISC-V 32' },
  { value: 'risc_v64', label: 'RISC-V 64' },
  { value: 'sparc', label: 'SPARC' },
  { value: 'system_z', label: 'SystemZ' },
];

interface PopupState {
  visible: boolean;
  type: PopupType;
  title: string;
  message: string;
}

export const EFELGui: React.FC = () => {
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
          addLog('WARN', `反汇编警告: ${result.error}`);
        } else {
          setDisasmResult(result.instructions);
        }
      } catch (e) {
        addLog('WARN', `反汇编失败: ${e}`);
      }
    };

    runDisasm();
  }, [disasmArch, memoryData, memoryBaseAddr, addLog]);

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
      showPopup('error', '操作超时', '设备响应超时，请检查设备连接或重新选择设备');
    } else if (context && context.mode !== 'fel') {
      showPopup('warning', '不支持的模式', `当前设备模式为 "${context.modeStr}"，仅支持 FEL 模式`);
    }
  }, [isTimeout, context, showPopup]);

  const initContext = useCallback(async () => {
    if (!selectedDevice) return;
    try {
      const ctx = new EfexContext();
      await ctx.open();
      await ctx.refreshMode();
      setContext(ctx);
      setIsTimeout(false);
      addLog('OKAY', `已选择: ${getChipName(selectedDevice.chip_version)} [${ctx.modeStr}]`);
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      addLog('ERRO', `初始化失败: ${e.message}`);
      setContext(null);
      if (err instanceof EfexError && err.isTimeout()) {
        setIsTimeout(true);
        showPopup('error', '操作超时', '设备初始化超时，请检查设备连接');
      }
    }
  }, [selectedDevice, addLog, showPopup]);

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
      setIsTimeout(e instanceof EfexError && e.isTimeout());
      addLog('ERRO', `扫描失败: ${e.message}`);
      if (e instanceof EfexError && e.isTimeout()) {
        showPopup('error', '操作超时', '设备扫描超时，请检查设备连接');
      }
    } finally {
      setScanning(false);
    }
  }, [addLog, showPopup]);

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
      setMemoryBaseAddr(addr);
      addLog('OKAY', `读取成功: ${len} 字节`);
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      setIsTimeout(e instanceof EfexError && e.isTimeout());
      addLog('ERRO', `读取失败: ${e.message}`);
      setMemoryData(null);
    } finally {
      setLoading(false);
    }
  }, [context, address, length, addLog]);

  const handleSaveMemory = useCallback(async () => {
    if (!memoryData) {
      addLog('ERRO', '没有可保存的数据');
      return;
    }
    const filePath = await save({
      title: '保存内存数据',
      defaultPath: `memory_${address.replace('0x', '')}.bin`,
      filters: [{ name: 'Binary', extensions: ['bin'] }],
    });
    if (!filePath) return;
    try {
      await writeFile(filePath, memoryData);
      addLog('OKAY', `已保存到: ${filePath}`);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      addLog('ERRO', `保存失败: ${e.message}`);
    }
  }, [memoryData, address, addLog]);

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
      setIsTimeout(e instanceof EfexError && e.isTimeout());
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
      const packer = new OpenixPacker();
      const success = packer.loadImage(fileData.buffer);
      if (!success) {
        addLog('ERRO', '无法加载镜像文件');
        return;
      }

      const fesData = getFes(packer);
      if (!fesData) {
        addLog('ERRO', '镜像中未找到 FES 程序');
        return;
      }

      const result = await initDRAM(context, fesData, {
        onLog: (level: 'info' | 'warn' | 'error', msg: string) => addLog(level.toUpperCase().slice(0, 4), msg),
        onProgress: (stage: string) => addLog('INFO', stage),
      });

      if (!result.success) {
        addLog('ERRO', 'DRAM 初始化失败');
        return;
      }
      addLog('OKAY', '初始化完成');
    } catch (err) {
      const e = err instanceof EfexError ? err : new Error(String(err));
      setIsTimeout(e instanceof EfexError && e.isTimeout());
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
      setIsTimeout(e instanceof EfexError && e.isTimeout());
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
    const baseAddr = memoryBaseAddr;

    let dataOffset = 0;
    const isDisasmOff = disasmArch === 'off';

    const insnMap = new Map<number, typeof disasmResult[0]>();
    for (const insn of disasmResult) {
      insnMap.set(insn.address, insn);
    }

    const maxInsnSize = disasmResult.length > 0
      ? Math.max(...disasmResult.map(insn => insn.size))
      : 0;

    while (dataOffset < memoryData.length) {
      const rowAddr = baseAddr + dataOffset;

      if (!isDisasmOff && insnMap.has(rowAddr)) {
        const insn = insnMap.get(rowAddr)!;
        const insnSize = Math.min(insn.size, memoryData.length - dataOffset);
        const insnBytes = memoryData.slice(dataOffset, dataOffset + insnSize);
        const hexParts: string[] = [];
        const asciiParts: string[] = [];

        for (let j = 0; j < insnSize; j++) {
          const byte = insnBytes[j];
          hexParts.push(byte.toString(16).toUpperCase().padStart(2, '0'));
          asciiParts.push(byte >= 33 && byte <= 126 ? String.fromCharCode(byte) : '.');
        }

        for (let j = insnSize; j < maxInsnSize && j < 16; j++) {
          hexParts.push('  ');
          asciiParts.push(' ');
        }

        const disasmStr = `${insn.mnemonic}${insn.op_str ? ' ' + insn.op_str : ''}`;

        rows.push(
          <div key={dataOffset} className="hex-row hex-row-disasm">
            <span className="hex-addr">{formatHex(rowAddr)}</span>
            <span className="hex-bytes">{hexParts.join(' ')}</span>
            <span className="hex-ascii">{asciiParts.join('')}</span>
            <span className="hex-disasm">{disasmStr}</span>
          </div>
        );
        dataOffset += insnSize;
      } else if (isDisasmOff) {
        const rowBytes = memoryData.slice(dataOffset, Math.min(dataOffset + 16, memoryData.length));
        const hexParts: string[] = [];
        const asciiParts: string[] = [];
        for (let j = 0; j < 16; j++) {
          if (j < rowBytes.length) {
            const byte = rowBytes[j];
            hexParts.push(byte.toString(16).toUpperCase().padStart(2, '0'));
            asciiParts.push(byte >= 33 && byte <= 126 ? String.fromCharCode(byte) : '.');
          } else {
            hexParts.push('  ');
            asciiParts.push('.');
          }
          if (j === 7) hexParts.push('');
        }
        rows.push(
          <div key={dataOffset} className="hex-row">
            <span className="hex-addr">{formatHex(rowAddr)}</span>
            <span className="hex-bytes">{hexParts.join(' ')}</span>
            <span className="hex-ascii">{asciiParts.join('')}</span>
          </div>
        );
        dataOffset += 16;
      } else {
        const rowBytes = memoryData.slice(dataOffset, Math.min(dataOffset + 4, memoryData.length));
        const hexParts: string[] = [];
        const asciiParts: string[] = [];
        for (let j = 0; j < 4; j++) {
          if (j < rowBytes.length) {
            const byte = rowBytes[j];
            hexParts.push(byte.toString(16).toUpperCase().padStart(2, '0'));
            asciiParts.push(byte >= 33 && byte <= 126 ? String.fromCharCode(byte) : '.');
          } else {
            hexParts.push('  ');
            asciiParts.push('.');
          }
        }
        for (let j = 4; j < maxInsnSize && j < 16; j++) {
          hexParts.push('  ');
          asciiParts.push(' ');
        }
        rows.push(
          <div key={dataOffset} className="hex-row">
            <span className="hex-addr">{formatHex(rowAddr)}</span>
            <span className="hex-bytes">{hexParts.join(' ')}</span>
            <span className="hex-ascii">{asciiParts.join('')}</span>
            <span className="hex-disasm hex-disasm-unknown">???</span>
          </div>
        );
        dataOffset += 4;
      }
    }
    return <div className="hex-view">{rows}</div>;
  };

  const isReady = context !== null && context?.mode === 'fel';

  const getDeviceStatusClassName = () => {
    const classes = ['device-status'];
    if (isTimeout) classes.push('status-timeout');
    if (context && context.mode !== 'fel') classes.push('status-unsupported');
    if (isTimeout || (context && context.mode !== 'fel')) classes.push('status-clickable');
    return classes.join(' ');
  };

  const getDeviceStatusText = () => {
    if (isTimeout) return '超时';
    if (context && isReady) return '就绪';
    if (context && context.mode !== 'fel') return '不支持';
    return context?.modeStr || '连接中';
  };

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
            <div className="efex-btn-row">
              <button onClick={handleReadMemory} disabled={!isReady || loading} className="efex-btn efex-btn-primary efex-btn-flex-3">
                {loading ? '读取中...' : '读取内存'}
              </button>
              <button onClick={handleSaveMemory} disabled={!memoryData} className="efex-btn efex-btn-primary efex-btn-flex-1">
                保存
              </button>
            </div>
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
          <div className="section-header hex-header">
            <span>内存视图</span>
            <div className="hex-header-controls">
              <span className="hex-header-label">反汇编:</span>
              <select
                value={disasmArch}
                onChange={(e) => setDisasmArch(e.target.value as DisasmArch)}
                className="efex-select efex-select-inline"
              >
                {ARCH_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
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
