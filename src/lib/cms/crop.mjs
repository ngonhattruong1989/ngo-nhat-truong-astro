export const RATIOS = [
  { id: 'free', label: 'Tự do', value: 0 },
  { id: 'original', label: 'Ảnh gốc', value: -1 },
  { id: '1:1', label: '1:1', value: 1 },
  { id: '4:3', label: '4:3', value: 4 / 3 },
  { id: '3:2', label: '3:2', value: 3 / 2 },
  { id: '16:9', label: '16:9', value: 16 / 9 },
  { id: '3:4', label: '3:4', value: 3 / 4 },
  { id: '2:3', label: '2:3', value: 2 / 3 },
  { id: '9:16', label: '9:16', value: 9 / 16 },
];

export const MIN_SIZE = 32;

export function ratioValue(id, width, height) {
  const preset = RATIOS.find((entry) => entry.id === id);
  if (!preset) return 0;
  if (preset.id === 'original') return height > 0 ? width / height : 1;
  return preset.value;
}

// Hình chữ nhật lớn nhất, canh giữa, có tỉ lệ cho trước.
export function centeredRect(width, height, ratio) {
  if (!ratio) return { x: 0, y: 0, w: width, h: height };
  let w = width;
  let h = Math.round(width / ratio);
  if (h > height) {
    h = height;
    w = Math.round(height * ratio);
  }
  return { x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), w, h };
}

export function clampRect(rect, width, height) {
  const w = Math.min(Math.max(Math.round(rect.w), MIN_SIZE), width);
  const h = Math.min(Math.max(Math.round(rect.h), MIN_SIZE), height);
  const x = Math.min(Math.max(Math.round(rect.x), 0), width - w);
  const y = Math.min(Math.max(Math.round(rect.y), 0), height - h);
  return { x, y, w, h };
}

// Kéo một góc; giữ góc đối diện cố định và giữ tỉ lệ nếu ratio > 0.
// Vùng chọn không bao giờ được vượt ra ngoài ảnh: chỉ thu nhỏ được, không nới rộng
// quá kích thước thật của ảnh (width × height tính theo pixel gốc).
export function resizeRect(start, handle, dx, dy, width, height, ratio) {
  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.includes('n');
  const south = handle.includes('s');

  // Góc đối diện là điểm neo: phần ảnh còn lại từ neo tới mép chính là giới hạn.
  const anchorX = west ? start.x + start.w : start.x;
  const anchorY = north ? start.y + start.h : start.y;
  const maxW = Math.max(MIN_SIZE, west ? anchorX : width - anchorX);
  const maxH = Math.max(MIN_SIZE, north ? anchorY : height - anchorY);

  let w = start.w + (east ? dx : west ? -dx : 0);
  let h = start.h + (south ? dy : north ? -dy : 0);

  if (ratio > 0) {
    if (Math.abs(dx) >= Math.abs(dy)) h = w / ratio;
    else w = h * ratio;
    // Thu lại để vừa cả hai chiều mà vẫn đúng tỉ lệ.
    const fit = Math.min(maxW / w, maxH / h);
    if (fit < 1) {
      w *= fit;
      h *= fit;
    }
    if (w < MIN_SIZE) { w = MIN_SIZE; h = w / ratio; }
    if (h < MIN_SIZE) { h = MIN_SIZE; w = h * ratio; }
  } else {
    w = Math.min(Math.max(w, MIN_SIZE), maxW);
    h = Math.min(Math.max(h, MIN_SIZE), maxH);
  }

  w = Math.round(w);
  h = Math.round(h);

  let x = west ? anchorX - w : anchorX;
  let y = north ? anchorY - h : anchorY;
  x = Math.min(Math.max(x, 0), width - w);
  y = Math.min(Math.max(y, 0), height - h);

  return { x: Math.round(x), y: Math.round(y), w, h };
}

export function moveRect(start, dx, dy, width, height) {
  return clampRect({ x: start.x + dx, y: start.y + dy, w: start.w, h: start.h }, width, height);
}

export function outputSize(rect, maxWidth = 2400) {
  const scale = rect.w > maxWidth ? maxWidth / rect.w : 1;
  return { width: Math.max(1, Math.round(rect.w * scale)), height: Math.max(1, Math.round(rect.h * scale)) };
}
