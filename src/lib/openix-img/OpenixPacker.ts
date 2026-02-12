import {
  IMAGEWTY_MAGIC,
  IMAGEWTY_MAGIC_LEN,
  IMAGEWTY_FILEHDR_LEN,
  IMAGEWTY_FHDR_MAINTYPE_LEN,
  IMAGEWTY_FHDR_SUBTYPE_LEN,
  IMAGEWTY_FHDR_FILENAME_LEN,
  ImageHeader,
  FileHeader,
  ImageInfo,
  FileInfo,
} from './types';

export class OpenixPacker {
  private imageData: ArrayBuffer | null = null;
  private imageHeader: ImageHeader | null = null;
  private fileHeaders: FileHeader[] = [];
  private isEncrypted: boolean = false;
  private imageLoaded: boolean = false;

  loadImage(data: ArrayBuffer): boolean {
    try {
      this.imageData = data;
      const view = new DataView(data);

      const magicBytes = new Uint8Array(data, 0, IMAGEWTY_MAGIC_LEN);
      const magicString = this.bytesToString(magicBytes);

      this.isEncrypted = magicString !== IMAGEWTY_MAGIC;

      if (this.isEncrypted) {
        console.warn('Image appears to be encrypted. Decryption is not supported in this version.');
        this.imageLoaded = false;
        return false;
      }

      this.imageHeader = this.parseImageHeader(view);

      const numFiles = this.getNumFiles();
      this.fileHeaders = [];

      for (let i = 0; i < numFiles; i++) {
        const offset = IMAGEWTY_FILEHDR_LEN + i * IMAGEWTY_FILEHDR_LEN;
        const fileHeader = this.parseFileHeader(view, offset);
        this.fileHeaders.push(fileHeader);
      }

      this.imageLoaded = true;
      return true;
    } catch (error) {
      console.error('Error loading image:', error);
      this.imageLoaded = false;
      return false;
    }
  }

  private bytesToString(bytes: Uint8Array): string {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] === 0) break;
      result += String.fromCharCode(bytes[i]);
    }
    return result;
  }

  private parseImageHeader(view: DataView): ImageHeader {
    const magicBytes = new Uint8Array(view.buffer, 0, IMAGEWTY_MAGIC_LEN);
    const magic = this.bytesToString(magicBytes);

    const header: ImageHeader = {
      magic,
      header_version: view.getUint32(8, true),
      header_size: view.getUint32(12, true),
      ram_base: view.getUint32(16, true),
      version: view.getUint32(20, true),
      image_size: view.getUint32(24, true),
      image_header_size: view.getUint32(28, true),
    };

    if (header.header_version === 0x0300) {
      header.v3 = {
        unknown: view.getUint32(32, true),
        pid: view.getUint32(36, true),
        vid: view.getUint32(40, true),
        hardware_id: view.getUint32(44, true),
        firmware_id: view.getUint32(48, true),
        val1: view.getUint32(52, true),
        val1024: view.getUint32(56, true),
        num_files: view.getUint32(60, true),
        val1024_2: view.getUint32(64, true),
        val0: view.getUint32(68, true),
        val0_2: view.getUint32(72, true),
        val0_3: view.getUint32(76, true),
        val0_4: view.getUint32(80, true),
      };
    } else {
      header.v1 = {
        pid: view.getUint32(32, true),
        vid: view.getUint32(36, true),
        hardware_id: view.getUint32(40, true),
        firmware_id: view.getUint32(44, true),
        val1: view.getUint32(48, true),
        val1024: view.getUint32(52, true),
        num_files: view.getUint32(56, true),
        val1024_2: view.getUint32(60, true),
        val0: view.getUint32(64, true),
        val0_2: view.getUint32(68, true),
        val0_3: view.getUint32(72, true),
        val0_4: view.getUint32(76, true),
      };
    }

    return header;
  }

  private parseFileHeader(view: DataView, offset: number): FileHeader {
    const header: FileHeader = {
      filename_len: view.getUint32(offset, true),
      total_header_size: view.getUint32(offset + 4, true),
      maintype: this.bytesToString(new Uint8Array(view.buffer, offset + 8, IMAGEWTY_FHDR_MAINTYPE_LEN)),
      subtype: this.bytesToString(new Uint8Array(view.buffer, offset + 16, IMAGEWTY_FHDR_SUBTYPE_LEN)),
    };

    if (this.imageHeader?.header_version === 0x0300) {
      header.v3 = {
        unknown_0: view.getUint32(offset + 32, true),
        filename: this.bytesToString(new Uint8Array(view.buffer, offset + 36, IMAGEWTY_FHDR_FILENAME_LEN)),
        stored_length: view.getUint32(offset + 292, true),
        pad1: view.getUint32(offset + 296, true),
        original_length: view.getUint32(offset + 300, true),
        pad2: view.getUint32(offset + 304, true),
        offset: view.getUint32(offset + 308, true),
      };
    } else {
      header.v1 = {
        unknown_3: view.getUint32(offset + 32, true),
        stored_length: view.getUint32(offset + 36, true),
        original_length: view.getUint32(offset + 40, true),
        offset: view.getUint32(offset + 44, true),
        unknown: view.getUint32(offset + 48, true),
        filename: this.bytesToString(new Uint8Array(view.buffer, offset + 52, IMAGEWTY_FHDR_FILENAME_LEN)),
      };
    }

    return header;
  }

  private getNumFiles(): number {
    if (!this.imageHeader) return 0;
    return this.imageHeader.v3?.num_files ?? this.imageHeader.v1?.num_files ?? 0;
  }

  isImageLoaded(): boolean {
    return this.imageLoaded;
  }

  isEncryptedImage(): boolean {
    return this.isEncrypted;
  }

  getImageHeader(): ImageHeader | null {
    return this.imageHeader;
  }

  getFileHeaders(): FileHeader[] {
    return this.fileHeaders;
  }

  getImageInfo(): ImageInfo | null {
    if (!this.imageLoaded || !this.imageHeader) {
      return null;
    }

    const files: FileInfo[] = this.fileHeaders.map((fh) => {
      const v = fh.v3 || fh.v1;
      return {
        filename: v?.filename || '',
        maintype: fh.maintype,
        subtype: fh.subtype,
        storedLength: v?.stored_length || 0,
        originalLength: v?.original_length || 0,
        offset: v?.offset || 0,
      };
    });

    return {
      header: this.imageHeader,
      files,
      isEncrypted: this.isEncrypted,
    };
  }

  checkFileByFilename(filename: string): boolean {
    return this.fileHeaders.some((fh) => {
      const v = fh.v3 || fh.v1;
      return v?.filename === filename;
    });
  }

  getFileHeaderByFilename(filename: string): FileHeader | null {
    return this.fileHeaders.find((fh) => {
      const v = fh.v3 || fh.v1;
      return v?.filename === filename;
    }) || null;
  }

  getFileDataByFilename(filename: string): Uint8Array | null {
    if (!this.imageLoaded || !this.imageData) {
      return null;
    }

    const fileHeader = this.getFileHeaderByFilename(filename);
    if (!fileHeader) {
      return null;
    }

    const v = fileHeader.v3 || fileHeader.v1;
    if (!v) {
      return null;
    }

    const { offset, original_length } = v;
    return new Uint8Array(this.imageData, offset, original_length);
  }

  getFileDataByMaintypeSubtype(maintype: string, subtype: string): Uint8Array | null {
    if (!this.imageLoaded || !this.imageData) {
      return null;
    }

    const fileHeader = this.fileHeaders.find((fh) => {
      return fh.maintype === maintype && fh.subtype === subtype;
    });

    if (!fileHeader) {
      return null;
    }

    const v = fileHeader.v3 || fileHeader.v1;
    if (!v) {
      return null;
    }

    const { offset, original_length } = v;
    return new Uint8Array(this.imageData, offset, original_length);
  }

  freeImage(): void {
    this.imageData = null;
    this.imageHeader = null;
    this.fileHeaders = [];
    this.imageLoaded = false;
  }

  getFunctionBySubtype(subtype: string): string | null {
    const functionMap: Record<string, string> = {
      'SYS_CONFIG100000': 'SYS CONFIG 配置文件',
      'SYS_CONFIG_BIN00': 'SYS CONFIG 配置二进制',
      'SYS_CONFIG000000': '分区表',
      'BOARD_CONFIG_BIN': '板级配置文件二进制格式',
      'DTB_CONFIG000000': '独立内核设备树',
      '1234567890BOOT_0': '卡启动 BOOT0',
      '1234567890BNOR_0': 'SPI NOR 启动 BOOT0',
      'UBOOT_0000000000': '烧录使用的 U-Boot',
      'UBOOT_CRASH_0000': '崩溃转储使用的 U-Boot',
      'FES_1-0000000000': 'DDR 初始化 BIN',
      'BOOTPKG-00000000	': '常规介质 BOOTPACKAGE',
      'BOOTPKG-NOR00000': 'SPI NOR 启动 BOOTPACKAGE',
      'XXXXXXXXXXXXXXXX': 'PC 烧录插件',
      '1234567890CARDTL': '卡烧录插件',
      '1234567890SCRIPT': '卡量产配置文件',
      '1234567890___GPT': 'GPT 分区表',
      '1234567890___MBR': 'MBR 分区表',
    };

    return functionMap[subtype] || null;
  }
}

