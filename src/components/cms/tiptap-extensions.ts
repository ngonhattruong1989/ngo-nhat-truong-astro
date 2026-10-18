import { Extension } from '@tiptap/core';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: Record<string, unknown>) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (size: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

const spacingAttributes = {
  lineHeight: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
  },
  marginBottom: {
    default: null,
    parseHTML: (element: HTMLElement) => element.style.marginBottom || null,
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes.marginBottom ? { style: `margin-bottom: ${attributes.marginBottom}` } : {},
  },
};

export const SpacedParagraph = Paragraph.extend({
  addAttributes() {
    return { ...this.parent?.(), ...spacingAttributes };
  },
});

export const SpacedHeading = Heading.extend({
  addAttributes() {
    return { ...this.parent?.(), ...spacingAttributes };
  },
});
