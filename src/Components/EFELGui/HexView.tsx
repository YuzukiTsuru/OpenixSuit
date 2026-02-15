import React from 'react';
import { DisasmArch, DisasmInstruction, ARCH_OPTIONS } from './Types';
import { formatHex } from './Utils';
import './EFELGui.css';

interface HexViewProps {
  memoryData: Uint8Array;
  memoryBaseAddr: number;
  disasmArch: DisasmArch;
  disasmResult: DisasmInstruction[];
  onArchChange: (arch: DisasmArch) => void;
}

export const HexView: React.FC<HexViewProps> = ({
  memoryData,
  memoryBaseAddr,
  disasmArch,
  disasmResult,
  onArchChange,
}) => {
  const renderHexView = () => {
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

  return (
    <div className="efex-hex-container">
      <div className="section-header hex-header">
        <span>内存视图</span>
        <div className="hex-header-controls">
          <span className="hex-header-label">反汇编:</span>
          <select
            value={disasmArch}
            onChange={(e) => onArchChange(e.target.value as DisasmArch)}
            className="efex-select efex-select-inline"
          >
            {ARCH_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      {renderHexView()}
    </div>
  );
};
