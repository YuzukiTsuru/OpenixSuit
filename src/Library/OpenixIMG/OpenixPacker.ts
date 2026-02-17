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
} from './Types';
import { getFunctionBySubtype } from './GetImageData';
import { uint8ArrayToString } from '../../Utils';
import { open, SeekMode, FileHandle } from '@tauri-apps/plugin-fs';

const PARTITION_DOWNLOADFILE_SUFFIX = '0000000000';

export class OpenixPacker {
  private fileHandle: FileHandle | null = null;
  private imageHeader: ImageHeader | null = null;
  private fileHeaders: FileHeader[] = [];
  private isEncrypted: boolean = false;
  private imageLoaded: boolean = false;

  async loadImageFromPath(filePath: string): Promise<boolean> {
    try {
      this.fileHandle = await open(filePath, { read: true });

      const magicBuffer = new Uint8Array(IMAGEWTY_MAGIC_LEN);
      await this.fileHandle.read(magicBuffer);
      const magicString = this.bytesToString(magicBuffer);

      this.isEncrypted = magicString !== IMAGEWTY_MAGIC;

      if (this.isEncrypted) {
        console.warn('Image appears to be encrypted. Decryption is not supported in this version.');
        await this.closeFile();
        this.imageLoaded = false;
        return false;
      }

      await this.fileHandle.seek(0, SeekMode.Start);
      const headerBuffer = new Uint8Array(IMAGEWTY_FILEHDR_LEN);
      await this.fileHandle.read(headerBuffer);
      const headerView = new DataView(headerBuffer.buffer);
      this.imageHeader = this.parseImageHeader(headerView);

      const numFiles = this.getNumFiles();
      this.fileHeaders = [];

      for (let i = 0; i < numFiles; i++) {
        const offset = IMAGEWTY_FILEHDR_LEN + i * IMAGEWTY_FILEHDR_LEN;
        await this.fileHandle.seek(offset, SeekMode.Start);
        const fileHeaderBuffer = new Uint8Array(IMAGEWTY_FILEHDR_LEN);
        await this.fileHandle.read(fileHeaderBuffer);
        const fileHeaderView = new DataView(fileHeaderBuffer.buffer);
        const fileHeader = this.parseFileHeader(fileHeaderView, 0);
        this.fileHeaders.push(fileHeader);
      }

      this.imageLoaded = true;
      return true;
    } catch (error) {
      console.error('Error loading image:', error);
      await this.closeFile();
      this.imageLoaded = false;
      return false;
    }
  }

  private async closeFile(): Promise<void> {
    if (this.fileHandle) {
      try {
        await this.fileHandle.close();
      } catch (e) {
        console.error('Error closing file:', e);
      }
      this.fileHandle = null;
    }
  }

  loadImage(data: ArrayBuffer): boolean {
    try {
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
    return uint8ArrayToString(bytes);
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

  async getFileDataByFilename(filename: string): Promise<Uint8Array | null> {
    if (!this.imageLoaded) {
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
    return this.readDataAtOffset(offset, original_length);
  }

  async getFileDataByMaintypeSubtype(maintype: string, subtype: string): Promise<Uint8Array | null> {
    if (!this.imageLoaded) {
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
    return this.readDataAtOffset(offset, original_length);
  }

  private async readDataAtOffset(offset: number, length: number): Promise<Uint8Array | null> {
    if (!this.fileHandle) {
      return null;
    }

    try {
      await this.fileHandle.seek(offset, SeekMode.Start);
      const buffer = new Uint8Array(length);
      await this.fileHandle.read(buffer);
      return buffer;
    } catch (error) {
      console.error('Error reading data at offset:', error);
      return null;
    }
  }

  getFileInfoByFilename(filename: string): { offset: number; length: number } | null {
    if (!this.imageLoaded) {
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

    return { offset: v.offset, length: v.original_length };
  }

  getFileInfoByMaintypeSubtype(maintype: string, subtype: string): { offset: number; length: number } | null {
    if (!this.imageLoaded) {
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

    return { offset: v.offset, length: v.original_length };
  }

  async *readDataByFilenameStream(
    filename: string,
    chunkSize: number = 64 * 1024
  ): AsyncGenerator<Uint8Array, void, unknown> {
    const fileInfo = this.getFileInfoByFilename(filename);
    if (!fileInfo) {
      throw new Error(`File not found: ${filename}`);
    }
    if (!this.fileHandle) {
      throw new Error('File handle is not available');
    }

    yield* this.readDataStream(fileInfo.offset, fileInfo.length, chunkSize);
  }

  async *readDataByMaintypeSubtypeStream(
    maintype: string,
    subtype: string,
    chunkSize: number = 64 * 1024
  ): AsyncGenerator<Uint8Array, void, unknown> {
    const fileInfo = this.getFileInfoByMaintypeSubtype(maintype, subtype);
    if (!fileInfo) {
      throw new Error(`File not found: maintype=${maintype}, subtype=${subtype}`);
    }
    if (!this.fileHandle) {
      throw new Error('File handle is not available');
    }

    yield* this.readDataStream(fileInfo.offset, fileInfo.length, chunkSize);
  }

  private async *readDataStream(
    offset: number,
    length: number,
    chunkSize: number
  ): AsyncGenerator<Uint8Array, void, unknown> {
    if (!this.fileHandle) {
      return;
    }

    try {
      await this.fileHandle.seek(offset, SeekMode.Start);

      let remaining = length;
      while (remaining > 0) {
        const readSize = Math.min(remaining, chunkSize);
        const buffer = new Uint8Array(readSize);
        const bytesRead = await this.fileHandle.read(buffer);

        if (bytesRead === null || bytesRead === 0) {
          break;
        }

        if (bytesRead < readSize) {
          yield buffer.slice(0, bytesRead);
        } else {
          yield buffer;
        }

        remaining -= bytesRead;
      }
    } catch (error) {
      console.error('Error reading data stream:', error);
    }
  }

  async freeImage(): Promise<void> {
    await this.closeFile();
    this.imageHeader = null;
    this.fileHeaders = [];
    this.imageLoaded = false;
  }

  getFunctionBySubtype(subtype: string): string | null {
    return getFunctionBySubtype(subtype);
  }

  buildSubtypeByFilename(partitionName: string): string {
    const suffix = `${partitionName.toUpperCase().replace('.', '_')}${PARTITION_DOWNLOADFILE_SUFFIX}`;
    return suffix.slice(0, 16);
  }
}

