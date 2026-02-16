export interface BootFileHead {
  jump_instruction: number;
  magic: string;
  check_sum: number;
  length: number;
  pub_head_size: number;
  pub_head_vsn: number[];
  ret_addr: number;
  run_addr: number;
  boot_cpu: number;
  platform: string;
}

export interface DramParamInfo {
  dram_init_flag: number;
  dram_update_flag: number;
  dram_para: number[];
}

export interface UBootBaseHead {
  jump_instruction: number;
  magic: string;
  check_sum: number;
  align_size: number;
  length: number;
  uboot_length: number;
  version: string;
  platform: string;
  run_addr: number;
}

export interface UBootNormalGpioCfg {
  port: number;
  port_num: number;
  mul_sel: number;
  pull: number;
  drv_level: number;
  data: number;
  reserved: number[];
}

export interface UBootDataHead {
  dram_para: number[];
  run_clock: number;
  run_core_vol: number;
  uart_port: number;
  uart_gpio: UBootNormalGpioCfg[];
  twi_port: number;
  twi_gpio: UBootNormalGpioCfg[];
  work_mode: number;
  storage_type: number;
  nand_gpio: UBootNormalGpioCfg[];
  nand_spare_data: number[];
  sdcard_gpio: UBootNormalGpioCfg[];
  sdcard_spare_data: number[];
  secureos_exist: number;
  monitor_exist: number;
  func_mask: number;
  uboot_backup: number;
  uboot_start_sector_in_mmc: number;
  dtb_offset: number;
  boot_package_size: number;
  dram_scan_size: number;
  reserved: number[];
  pmu_type: number;
  uart_input: number;
  key_input: number;
  secure_mode: number;
  debug_mode: number;
  reserved2: number[];
}

export interface UBootExtHead {
  data: number[];
}

export interface UBootHead {
  uboot_head: UBootBaseHead;
  uboot_data: UBootDataHead;
  uboot_ext: UBootExtHead[];
  hash: number[];
}

export interface SunxiPartition {
  addrhi: number;
  addrlo: number;
  lenhi: number;
  lenlo: number;
  classname: string;
  name: string;
  user_type: number;
  keydata: number;
  ro: number;
  res: number[];
}

export interface SunxiMbr {
  crc32: number;
  version: number;
  magic: string;
  copy: number;
  index: number;
  PartCount: number;
  stamp: number[];
  array: SunxiPartition[];
  res: number[];
}

export interface PartitionInfo {
  name: string;
  classname: string;
  address: bigint;
  length: bigint;
  user_type: number;
  keydata: number;
  readonly: boolean;
}

export interface MbrInfo {
  crc32: number;
  version: number;
  magic: string;
  copy: number;
  index: number;
  partCount: number;
  partitions: PartitionInfo[];
}

export type BootFileHeadRaw = {
  jump_instruction: number;
  magic: Uint8Array;
  check_sum: number;
  length: number;
  pub_head_size: number;
  pub_head_vsn: Uint8Array;
  ret_addr: number;
  run_addr: number;
  boot_cpu: number;
  platform: Uint8Array;
};

export type DramParamInfoRaw = {
  dram_init_flag: number;
  dram_update_flag: number;
  dram_para: Uint8Array;
};

export type UBootBaseHeadRaw = {
  jump_instruction: number;
  magic: Uint8Array;
  check_sum: number;
  align_size: number;
  length: number;
  uboot_length: number;
  version: Uint8Array;
  platform: Uint8Array;
  run_addr: number;
};

export type UBootNormalGpioCfgRaw = {
  port: number;
  port_num: number;
  mul_sel: number;
  pull: number;
  drv_level: number;
  data: number;
  reserved: Uint8Array;
};

export type SunxiPartitionRaw = {
  addrhi: number;
  addrlo: number;
  lenhi: number;
  lenlo: number;
  classname: Uint8Array;
  name: Uint8Array;
  user_type: number;
  keydata: number;
  ro: number;
  res: Uint8Array;
};
