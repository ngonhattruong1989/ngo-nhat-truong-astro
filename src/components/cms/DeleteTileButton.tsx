import { useState } from 'react';
import DeleteDialog from './DeleteDialog';
import { store } from '../../lib/cms/client';
import { keysToDelete } from '../../lib/cms/media-refs.mjs';

type Props = {
  section: string;
  id: string;
  title: string;
  onDeleted: () => void;
};

// Nút xóa ngay trên block trong danh sách: xóa cả 3 ngôn ngữ + folder R2.
export default function DeleteTileButton({ section, id, title, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const locales = store.localesFor(section, id);
  const items = locales.map((code) => store.item(section, id, code)).filter(Boolean);
  const keys = keysToDelete(items as any[], store.mediaBase());

  async function confirm() {
    setBusy(true);
    try {
      await store.deleteEverywhere(section, id);
      onDeleted();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title="Xóa mục"
        className="danger"
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}
      >
        ✕
      </button>
      <DeleteDialog
        open={open}
        title={title || id}
        slug={id}
        locales={locales.length || 1}
        mediaKeys={keys}
        onCancel={() => { if (!busy) setOpen(false); }}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
