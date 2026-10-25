import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import { FontSize, SpacedHeading, SpacedParagraph } from './tiptap-extensions';
import { RichImage, VideoBlock, YoutubeBlock } from './media-nodes';
import { clampWidth, fitWidth } from '../../lib/cms/image-box.mjs';
import MediaDialog from './MediaDialog';
import type { MediaTarget, UploadFn } from '../../lib/cms/client';

const SIZES = ['13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px'];
const LINE_HEIGHTS = ['1.2', '1.4', '1.6', '1.8', '2'];
const PARAGRAPH_SPACING = ['8px', '16px', '24px', '32px'];

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  mediaContext: Omit<MediaTarget, 'kind'>;
  upload: UploadFn;
};

export default function RichText({ value, onChange, placeholder = 'Bắt đầu viết…', mediaContext, upload }: Props) {
  const [dialog, setDialog] = useState<'image' | 'video' | 'youtube' | null>(null);
  const [tick, setTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        history: { depth: 100 },
      }),
      SpacedParagraph,
      SpacedHeading.configure({ levels: [2, 3] }),
      TextStyle,
      FontSize,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      RichImage.configure({ inline: false, allowBase64: false }),
      VideoBlock,
      YoutubeBlock,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if ((value || '') !== editor.getHTML()) editor.commands.setContent(value || '', false);
  }, [value, editor]);

  // Cần re-render khi con trỏ nhảy sang một ảnh khác để thanh chỉnh khung ảnh đúng trạng thái.
  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((n) => n + 1);
    editor.on('selectionUpdate', bump);
    editor.on('update', bump);
    return () => {
      editor.off('selectionUpdate', bump);
      editor.off('update', bump);
    };
  }, [editor]);

  if (!editor) return null;
  const chain = () => editor.chain().focus() as any;

  const imageActive = editor.isActive('image');
  const imageAttrs = imageActive ? editor.getAttributes('image') : {};
  const imageWidth = clampWidth(imageAttrs.width ?? 100);
  const imageAlign = imageAttrs.align === 'center' || imageAttrs.align === 'right' ? imageAttrs.align : 'left';
  const columnPx = editor.view.dom.clientWidth || 0;

  function setImageAttr(patch: Record<string, unknown>) {
    chain().updateAttributes('image', patch).run();
  }

  // Ảnh đang chọn trong editor (ProseMirror gắn class này cho node được chọn).
  function selectedImage(): HTMLImageElement | null {
    return editor!.view.dom.querySelector('img.ProseMirror-selectednode') as HTMLImageElement | null;
  }

  function fitToNatural() {
    const element = selectedImage();
    if (!element) return;
    setImageAttr({ width: fitWidth(element.naturalWidth, columnPx) });
  }

  // Chèn ảnh với khung vừa đúng ảnh gốc: không phóng to, không tràn hết chiều ngang.
  function insertImage(src: string) {
    const column = editor!.view.dom.clientWidth || 0;
    const insert = (width: number) => chain().setImage({ src, width }).run();
    if (!column) { insert(100); return; }
    const probe = new window.Image();
    probe.onload = () => insert(fitWidth(probe.naturalWidth, column));
    probe.onerror = () => insert(100);
    probe.src = src;
  }

  return (
    <div>
      <div className="toolbar">
        <div className="tb-group">
          <button type="button" className="tb" title="Hoàn tác (Cmd/Ctrl+Z)" onClick={() => chain().undo().run()} disabled={!editor.can().undo()}>↶</button>
          <button type="button" className="tb" title="Làm lại (Shift+Cmd/Ctrl+Z)" onClick={() => chain().redo().run()} disabled={!editor.can().redo()}>↷</button>
        </div>
        <div className="tb-group">
          <select
            className="tb-select"
            title="Cỡ chữ"
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;
              chain().setFontSize(event.target.value).run();
              event.target.value = '';
            }}
          >
            <option value="">Cỡ chữ</option>
            {SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <button type="button" className={`tb ${editor.isActive('bold') ? 'on' : ''}`} title="In đậm" onClick={() => chain().toggleBold().run()}><b>B</b></button>
          <button type="button" className={`tb ${editor.isActive('italic') ? 'on' : ''}`} title="In nghiêng" onClick={() => chain().toggleItalic().run()}><i>I</i></button>
          <button type="button" className={`tb ${editor.isActive('underline') ? 'on' : ''}`} title="Gạch chân" onClick={() => chain().toggleUnderline().run()}><u>U</u></button>
          <button type="button" className={`tb ${editor.isActive('strike') ? 'on' : ''}`} title="Gạch ngang" onClick={() => chain().toggleStrike().run()}><s>S</s></button>
        </div>
        <div className="tb-group">
          <button type="button" className={`tb ${editor.isActive({ textAlign: 'left' }) ? 'on' : ''}`} title="Căn trái" onClick={() => chain().setTextAlign('left').run()}>⇤</button>
          <button type="button" className={`tb ${editor.isActive({ textAlign: 'center' }) ? 'on' : ''}`} title="Căn giữa" onClick={() => chain().setTextAlign('center').run()}>↔</button>
          <button type="button" className={`tb ${editor.isActive({ textAlign: 'right' }) ? 'on' : ''}`} title="Căn phải" onClick={() => chain().setTextAlign('right').run()}>⇥</button>
          <button type="button" className={`tb ${editor.isActive({ textAlign: 'justify' }) ? 'on' : ''}`} title="Căn đều hai bên" onClick={() => chain().setTextAlign('justify').run()}>☰</button>
        </div>
        <div className="tb-group">
          <select
            className="tb-select"
            title="Giãn dòng"
            defaultValue=""
            onChange={(event) => {
              const lineHeight = event.target.value;
              if (!lineHeight) return;
              chain().updateAttributes('paragraph', { lineHeight }).updateAttributes('heading', { lineHeight }).run();
              event.target.value = '';
            }}
          >
            <option value="">Giãn dòng</option>
            {LINE_HEIGHTS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select
            className="tb-select"
            title="Cách đoạn"
            defaultValue=""
            onChange={(event) => {
              const marginBottom = event.target.value;
              if (!marginBottom) return;
              chain().updateAttributes('paragraph', { marginBottom }).updateAttributes('heading', { marginBottom }).run();
              event.target.value = '';
            }}
          >
            <option value="">Cách đoạn</option>
            {PARAGRAPH_SPACING.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="tb-group">
          <button type="button" className={`tb ${editor.isActive('bulletList') ? 'on' : ''}`} title="Danh sách" onClick={() => chain().toggleBulletList().run()}>•</button>
          <button type="button" className={`tb ${editor.isActive('orderedList') ? 'on' : ''}`} title="Danh sách số" onClick={() => chain().toggleOrderedList().run()}>1.</button>
          <button type="button" className={`tb ${editor.isActive('blockquote') ? 'on' : ''}`} title="Trích dẫn" onClick={() => chain().toggleBlockquote().run()}>❝</button>
          <button type="button" className={`tb ${editor.isActive('heading', { level: 2 }) ? 'on' : ''}`} title="Tiêu đề lớn" onClick={() => chain().toggleHeading({ level: 2 }).run()}>H2</button>
          <button type="button" className={`tb ${editor.isActive('heading', { level: 3 }) ? 'on' : ''}`} title="Tiêu đề nhỏ" onClick={() => chain().toggleHeading({ level: 3 }).run()}>H3</button>
        </div>
        <div className="tb-group">
          <button
            type="button"
            className="tb"
            title="Chèn liên kết"
            onClick={() => {
              const url = window.prompt('Dán URL (https://, mailto:, tel: hoặc /duong-dan):', 'https://');
              if (!url) return;
              chain().extendMarkRange('link').setLink({ href: url }).run();
            }}
          >🔗</button>
          <button type="button" className="tb" title="Bỏ liên kết" onClick={() => chain().unsetLink().run()} disabled={!editor.isActive('link')}>⛓</button>
          <button type="button" className="tb" title="Chèn ảnh" onClick={() => setDialog('image')}>🖼</button>
          <button type="button" className="tb" title="Chèn video" onClick={() => setDialog('video')}>🎬</button>
          <button type="button" className="tb" title="Nhúng YouTube" onClick={() => setDialog('youtube')}>▶</button>
        </div>
        <div className="tb-group" style={{ borderRight: 0 }}>
          <button type="button" className={`tb ${editor.isActive('code') ? 'on' : ''}`} title="Code" onClick={() => chain().toggleCode().run()}>{'</>'}</button>
          <button type="button" className="tb" title="Xóa định dạng" onClick={() => chain().unsetAllMarks().clearNodes().run()}>⌫</button>
        </div>
      </div>

      <div className={`image-tools ${imageActive ? 'is-active' : ''}`} data-selection={tick}>
        {imageActive ? (
          <>
            <span className="image-tools-label">Khung ảnh</span>
            <input
              className="image-range"
              type="range"
              min={10}
              max={100}
              step={5}
              value={imageWidth}
              title="Bề rộng khung ảnh trên website"
              onChange={(event) => setImageAttr({ width: Number(event.target.value) })}
            />
            <span className="image-tools-value">
              {imageWidth}%{columnPx ? ` · ≈${Math.round((columnPx * imageWidth) / 100)}px` : ''}
            </span>
            <div className="tb-group" style={{ borderRight: 0 }}>
              <button type="button" className={`tb ${imageAlign === 'left' ? 'on' : ''}`} title="Canh trái" onClick={() => setImageAttr({ align: 'left' })}>⇤</button>
              <button type="button" className={`tb ${imageAlign === 'center' ? 'on' : ''}`} title="Canh giữa" onClick={() => setImageAttr({ align: 'center' })}>↔</button>
              <button type="button" className={`tb ${imageAlign === 'right' ? 'on' : ''}`} title="Canh phải" onClick={() => setImageAttr({ align: 'right' })}>⇥</button>
            </div>
            <button type="button" className="tb" title="Rộng đúng bằng ảnh gốc, không phóng to" onClick={fitToNatural}>Vừa ảnh gốc</button>
            <button type="button" className="tb" title="Toàn chiều ngang cột nội dung" onClick={() => setImageAttr({ width: 100, align: 'left' })}>Toàn ngang</button>
          </>
        ) : (
          <span className="image-tools-hint">Bấm vào một ảnh trong canvas để chỉnh khung hiển thị (rộng bao nhiêu % và canh lề).</span>
        )}
      </div>

      <EditorContent editor={editor} />
      <MediaDialog
        open={dialog !== null}
        initialTab={dialog ?? 'image'}
        target={{ ...mediaContext, kind: 'images' }}
        upload={upload}
        onClose={() => setDialog(null)}
        onInsertImage={insertImage}
        onInsertVideo={(src) => chain().insertContent({ type: 'videoBlock', attrs: { src } }).run()}
        onInsertYoutube={(src) => chain().insertContent({ type: 'youtubeBlock', attrs: { src } }).run()}
      />
    </div>
  );
}
