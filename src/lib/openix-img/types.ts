export const IMAGEWTY_MAGIC = 'IMAGEWTY';
export const IMAGEWTY_MAGIC_LEN = 8;
export const IMAGEWTY_VERSION = 0x100234;
export const IMAGEWTY_FILEHDR_LEN = 1024;
export const IMAGEWTY_FHDR_MAINTYPE_LEN = 8;
export const IMAGEWTY_FHDR_SUBTYPE_LEN = 16;
export const IMAGEWTY_FHDR_FILENAME_LEN = 256;

export interface ImageHeaderV1 {
  pid: number;
  vid: number;
  hardware_id: number;
  firmware_id: number;
  val1: number;
  val1024: number;
  num_files: number;
  val1024_2: number;
  val0: number;
  val0_2: number;
  val0_3: number;
  val0_4: number;
}

export interface ImageHeaderV3 {
  unknown: number;
  pid: number;
  vid: number;
  hardware_id: number;
  firmware_id: number;
  val1: number;
  val1024: number;
  num_files: number;
  val1024_2: number;
  val0: number;
  val0_2: number;
  val0_3: number;
  val0_4: number;
}

export interface ImageHeader {
  magic: string;
  header_version: number;
  header_size: number;
  ram_base: number;
  version: number;
  image_size: number;
  image_header_size: number;
  v1?: ImageHeaderV1;
  v3?: ImageHeaderV3;
}

export interface FileHeaderV1 {
  unknown_3: number;
  stored_length: number;
  original_length: number;
  offset: number;
  unknown: number;
  filename: string;
}

export interface FileHeaderV3 {
  unknown_0: number;
  filename: string;
  stored_length: number;
  pad1: number;
  original_length: number;
  pad2: number;
  offset: number;
}

export interface FileHeader {
  filename_len: number;
  total_header_size: number;
  maintype: string;
  subtype: string;
  v1?: FileHeaderV1;
  v3?: FileHeaderV3;
}

export interface Partition {
  name: string;
  size: number;
  downloadfile: string;
  user_type: number;
  keydata: boolean;
  encrypt: boolean;
  verify: boolean;
  ro: boolean;
}

export enum ValueType {
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  LIST_ITEM = 'LIST_ITEM',
  REFERENCE = 'REFERENCE',
}

export interface Variable {
  name: string;
  type: ValueType;
  numberValue?: number;
  stringValue?: string;
  items?: Variable[];
}

export interface Group {
  name: string;
  variables: Variable[];
}

export interface ImageInfo {
  header: ImageHeader;
  files: FileInfo[];
  isEncrypted: boolean;
}

export interface FileInfo {
  filename: string;
  maintype: string;
  subtype: string;
  storedLength: number;
  originalLength: number;
  offset: number;
}
