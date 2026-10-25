// Kích thước hiển thị của một ảnh trong canvas (không phải kích thước file).
// Ảnh chỉ được thu nhỏ trong cột nội dung; muốn to hơn thì phải đổi ảnh gốc.

export const MIN_WIDTH = 10;
export const MAX_WIDTH = 100;
export const ALIGNS = ['left', 'center', 'right'];

export function clampWidth(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return MAX_WIDTH;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, number));
}

export function normalizeAlign(value) {
  return ALIGNS.includes(value) ? value : 'left';
}

// Inline style dùng chung cho website, preview và editor.
export function imageBoxStyle(width, align) {
  const w = clampWidth(width);
  const a = normalizeAlign(align);
  const margins = a === 'center'
    ? 'margin-left:auto;margin-right:auto'
    : a === 'right'
      ? 'margin-left:auto;margin-right:0'
      : 'margin-left:0;margin-right:auto';
  return `width:${w}%;max-width:100%;height:auto;display:block;${margins}`;
}

// Rộng nhất mà không phóng to ảnh: bề rộng thật của ảnh chia cho bề rộng cột nội dung.
export function fitWidth(naturalWidth, columnWidth) {
  if (!(naturalWidth > 0) || !(columnWidth > 0)) return MAX_WIDTH;
  const percent = Math.floor((naturalWidth / columnWidth) * 100 / 5) * 5;
  return clampWidth(percent);
}

// Đọc lại từ HTML đã lưu (inline style hoặc data-*).
export function readWidth(element) {
  if (!element) return MAX_WIDTH;
  const raw = element.getAttribute?.('data-width') || '';
  const fromAttr = Number(raw);
  if (Number.isFinite(fromAttr) && fromAttr > 0) return clampWidth(fromAttr);
  const style = element.style?.width || '';
  const match = /^([\d.]+)%$/.exec(style.trim());
  return match ? clampWidth(Number(match[1])) : MAX_WIDTH;
}

export function readAlign(element) {
  if (!element) return 'left';
  const attr = element.getAttribute?.('data-align');
  if (ALIGNS.includes(attr)) return attr;
  const style = element.style || {};
  if (style.marginLeft === 'auto' && style.marginRight === 'auto') return 'center';
  if (style.marginLeft === 'auto') return 'right';
  return 'left';
}
