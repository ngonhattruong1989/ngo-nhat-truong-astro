import { Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { imageBoxStyle, normalizeAlign, readAlign, readWidth } from '../../lib/cms/image-box.mjs';

// Ảnh trong canvas: ngoài src/alt còn có khung hiển thị (width % + canh lề).
// Chỉ thu nhỏ được trong cột nội dung nên website không còn ảnh tràn hết chiều ngang.
export const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 100,
        parseHTML: (element: HTMLElement) => readWidth(element),
        renderHTML: () => ({}),
      },
      align: {
        default: 'left',
        parseHTML: (element: HTMLElement) => readAlign(element),
        renderHTML: () => ({}),
      },
    };
  },
  renderHTML({ node, HTMLAttributes }: any) {
    const width = node.attrs.width ?? 100;
    const align = node.attrs.align ?? 'left';
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-width': String(Math.round(Number(width)) || 100),
        'data-align': normalizeAlign(align),
        style: imageBoxStyle(width, align),
      }),
    ];
  },
});

export const VideoBlock = Node.create({
  name: 'videoBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
      controls: {
        default: true,
        parseHTML: (element: HTMLElement) => element.hasAttribute('controls'),
        renderHTML: (attributes: Record<string, unknown>) => (attributes.controls ? { controls: '' } : {}),
      },
      loop: {
        default: false,
        parseHTML: (element: HTMLElement) => element.hasAttribute('loop'),
        renderHTML: (attributes: Record<string, unknown>) => (attributes.loop ? { loop: '' } : {}),
      },
      playsinline: {
        default: true,
        parseHTML: () => true,
        renderHTML: () => ({ playsinline: '' }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'video' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        preload: 'metadata',
        style: 'max-width:100%;height:auto;border-radius:2px',
      }),
    ];
  },
  addNodeView() {
    return ({ node }: any) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin:16px 0;text-align:center';
      const video = document.createElement('video');
      video.src = node.attrs.src || '';
      if (node.attrs.poster) video.poster = node.attrs.poster;
      video.controls = true;
      video.preload = 'metadata';
      video.style.cssText = 'max-width:100%;height:auto;border-radius:2px;pointer-events:none';
      wrapper.appendChild(video);
      return { dom: wrapper };
    };
  },
});

export const YoutubeBlock = Node.create({
  name: 'youtubeBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('src'),
        renderHTML: (attributes: Record<string, unknown>) => ({ src: attributes.src }),
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'iframe[src*="youtube.com/embed/"]' },
      { tag: 'iframe[src*="youtube-nocookie.com/embed/"]' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      mergeAttributes(HTMLAttributes, { frameborder: '0', allowfullscreen: 'true', loading: 'lazy' }),
    ];
  },
  addNodeView() {
    return ({ node }: any) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'margin:16px 0;position:relative;padding-top:56.25%';
      const iframe = document.createElement('iframe');
      iframe.src = node.attrs.src || '';
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none';
      wrapper.appendChild(iframe);
      return { dom: wrapper };
    };
  },
});
