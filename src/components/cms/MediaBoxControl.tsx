import { clampWidth, normalizeAlign } from '../../lib/cms/image-box.mjs';

type Props = {
  width: number;
  align: string;
  onChange: (patch: { width?: number; align?: string }) => void;
  label?: string;
  hint?: string;
};

// Khung hiển thị của một ảnh không nằm trong canvas (thumbnail của mục):
// cùng thang % và canh lề với thanh "Khung ảnh" trong editor, mặc định 100% / trái.
export default function MediaBoxControl({
  width,
  align,
  onChange,
  label = 'Kích thước hiển thị trên website',
  hint = 'Tính theo bề rộng cột nội dung của trang, giống ảnh trong canvas. 100% là toàn chiều ngang như trước.',
}: Props) {
  const value = clampWidth(width ?? 100);
  const current = normalizeAlign(align);

  return (
    <div className="field media-box">
      <label>{label}</label>
      <div className="media-box-row">
        <input
          className="image-range"
          type="range"
          min={10}
          max={100}
          step={5}
          value={value}
          onChange={(event) => onChange({ width: Number(event.target.value) })}
        />
        <span className="image-tools-value">{value}%</span>
        <div className="tb-group" style={{ borderRight: 0 }}>
          <button type="button" className={`tb ${current === 'left' ? 'on' : ''}`} title="Canh trái" onClick={() => onChange({ align: 'left' })}>⇤</button>
          <button type="button" className={`tb ${current === 'center' ? 'on' : ''}`} title="Canh giữa" onClick={() => onChange({ align: 'center' })}>↔</button>
          <button type="button" className={`tb ${current === 'right' ? 'on' : ''}`} title="Canh phải" onClick={() => onChange({ align: 'right' })}>⇥</button>
        </div>
        <button type="button" className="btn ghost" onClick={() => onChange({ width: 100, align: 'left' })}>Toàn ngang</button>
      </div>
      <div className="hint">{hint}</div>
    </div>
  );
}
