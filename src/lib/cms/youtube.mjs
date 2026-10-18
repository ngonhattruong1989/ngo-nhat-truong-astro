const ID_RE = /^[A-Za-z0-9_-]{6,20}$/;

export function youtubeId(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';
  if (ID_RE.test(raw)) return raw;
  const match = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,20})/.exec(raw);
  return match ? match[1] : raw;
}

export function youtubeEmbed(input) {
  const id = youtubeId(input);
  return ID_RE.test(id) ? `https://www.youtube.com/embed/${id}` : '';
}
