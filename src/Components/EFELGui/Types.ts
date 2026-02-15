export type DisasmArch =
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

export interface DisasmInstruction {
  address: number;
  size: number;
  bytes: number[];
  mnemonic: string;
  op_str: string;
}

export interface DisasmResult {
  instructions: DisasmInstruction[];
  error: string | null;
}

export interface LogEntry {
  time: Date;
  level: string;
  message: string;
}

export const ARCH_OPTIONS: { value: DisasmArch; label: string }[] = [
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
