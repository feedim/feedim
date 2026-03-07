/**
 * MP4 Faststart — relocates the moov atom before mdat for instant playback.
 * Runs entirely in the browser using File.slice() for memory efficiency.
 * Only the moov atom (~1-5MB) is loaded into memory, not the full video.
 */

interface Mp4Box {
  type: string;
  offset: number;
  size: number;
  headerSize: number;
}

async function parseBoxHeader(file: Blob, offset: number): Promise<Mp4Box | null> {
  if (offset >= file.size) return null;
  const chunk = await file.slice(offset, Math.min(offset + 16, file.size)).arrayBuffer();
  if (chunk.byteLength < 8) return null;

  const view = new DataView(chunk);
  let size = view.getUint32(0);
  const type = String.fromCharCode(
    view.getUint8(4), view.getUint8(5), view.getUint8(6), view.getUint8(7)
  );
  let headerSize = 8;

  if (size === 1) {
    if (chunk.byteLength < 16) return null;
    const hi = view.getUint32(8);
    const lo = view.getUint32(12);
    size = hi * 0x100000000 + lo;
    headerSize = 16;
  } else if (size === 0) {
    size = file.size - offset;
  }

  return { type, offset, size, headerSize };
}

async function parseTopLevelBoxes(file: Blob): Promise<Mp4Box[]> {
  const boxes: Mp4Box[] = [];
  let offset = 0;
  while (offset < file.size) {
    const box = await parseBoxHeader(file, offset);
    if (!box || box.size < 8) break;
    boxes.push(box);
    offset += box.size;
  }
  return boxes;
}

/**
 * Recursively walks the MP4 box hierarchy inside a moov atom buffer
 * and adjusts all stco/co64 chunk offsets by the given delta.
 */
function adjustChunkOffsets(buf: Uint8Array, start: number, end: number, delta: number): void {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = start;

  while (pos + 8 <= end) {
    let size = view.getUint32(pos);
    const type = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7]);
    let hdr = 8;

    if (size === 1 && pos + 16 <= end) {
      const hi = view.getUint32(pos + 8);
      const lo = view.getUint32(pos + 12);
      size = hi * 0x100000000 + lo;
      hdr = 16;
    } else if (size === 0) {
      size = end - pos;
    }

    if (size < 8 || pos + size > end) break;

    if (type === "stco") {
      // stco: [size:4][type:4][version:1][flags:3][entry_count:4][offsets:4*N]
      const dataStart = pos + hdr;
      if (dataStart + 8 <= end) {
        const entryCount = view.getUint32(dataStart + 4);
        for (let i = 0; i < entryCount; i++) {
          const ePos = dataStart + 8 + i * 4;
          if (ePos + 4 > end) break;
          view.setUint32(ePos, view.getUint32(ePos) + delta);
        }
      }
    } else if (type === "co64") {
      // co64: [size:4][type:4][version:1][flags:3][entry_count:4][offsets:8*N]
      const dataStart = pos + hdr;
      if (dataStart + 8 <= end) {
        const entryCount = view.getUint32(dataStart + 4);
        for (let i = 0; i < entryCount; i++) {
          const ePos = dataStart + 8 + i * 8;
          if (ePos + 8 > end) break;
          const hi = view.getUint32(ePos);
          const lo = view.getUint32(ePos + 4);
          const val = hi * 0x100000000 + lo + delta;
          view.setUint32(ePos, Math.floor(val / 0x100000000));
          view.setUint32(ePos + 4, val >>> 0);
        }
      }
    }

    // Recurse into container boxes
    const containers = ["moov", "trak", "mdia", "minf", "stbl", "edts", "udta", "mvex"];
    if (containers.includes(type)) {
      adjustChunkOffsets(buf, pos + hdr, pos + size, delta);
    }

    pos += size;
  }
}

/**
 * Checks if an MP4 file needs faststart optimization and relocates the moov
 * atom before mdat if needed. Returns the original file if already optimized.
 *
 * Memory-efficient: only loads the moov atom (~1-5MB) into memory.
 */
export async function mp4Faststart(file: File): Promise<File> {
  try {
    const boxes = await parseTopLevelBoxes(file);

    const moovIdx = boxes.findIndex((b) => b.type === "moov");
    const mdatIdx = boxes.findIndex((b) => b.type === "mdat");

    // No moov or no mdat — not a standard MP4
    if (moovIdx < 0 || mdatIdx < 0) return file;

    // Already faststart (moov before mdat)
    if (moovIdx < mdatIdx) return file;

    // Multiple mdat boxes — edge case, skip optimization
    if (boxes.filter((b) => b.type === "mdat").length !== 1) return file;

    const moov = boxes[moovIdx];
    const mdat = boxes[mdatIdx];

    // Read moov atom into memory
    const moovBuf = new Uint8Array(
      await file.slice(moov.offset, moov.offset + moov.size).arrayBuffer()
    );

    // Adjust chunk offsets: mdat shifts forward by moov.size
    adjustChunkOffsets(moovBuf, moov.headerSize, moov.size, moov.size);

    // Rebuild file: [pre-mdat] + [adjusted moov] + [mdat..moov_start] + [after moov]
    const parts: BlobPart[] = [];

    // Everything before mdat (ftyp, free, etc.)
    if (mdat.offset > 0) {
      parts.push(file.slice(0, mdat.offset));
    }

    // Adjusted moov
    parts.push(moovBuf);

    // mdat and anything between mdat and original moov position
    parts.push(file.slice(mdat.offset, moov.offset));

    // Anything after original moov (rare, but handle it)
    if (moov.offset + moov.size < file.size) {
      parts.push(file.slice(moov.offset + moov.size));
    }

    return new File([new Blob(parts)], file.name, { type: file.type });
  } catch {
    // If anything fails, return the original file
    return file;
  }
}
