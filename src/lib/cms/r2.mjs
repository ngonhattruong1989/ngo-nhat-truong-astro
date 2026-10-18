const KEY_RE = /^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*\/[a-z0-9-]+\/[a-z0-9._-]+$/;

export function prefixForItem({ section, id }) {
  if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Invalid id');
  if (section === 'films') return `films/${id}/`;
  if (typeof section !== 'string' || !/^[a-z0-9-]+$/.test(section)) throw new Error('Invalid section');
  return `${section}/${id}/`;
}

export function isSafeMediaKey(key) {
  if (typeof key !== 'string') return false;
  if (key.startsWith('/') || key.includes('..') || key.includes('//') || key.includes('\\')) return false;
  return KEY_RE.test(key);
}

export async function listKeys(bucket, prefix) {
  const keys = [];
  let cursor;
  do {
    const page = await bucket.list({ prefix, cursor });
    for (const object of page.objects || []) keys.push(object.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return keys;
}

export async function deleteKeys(bucket, keys) {
  const removed = [];
  const failed = [];
  const batch = 1000;
  for (let index = 0; index < keys.length; index += batch) {
    const slice = keys.slice(index, index + batch);
    try {
      await bucket.delete(slice);
      removed.push(...slice);
    } catch {
      for (const key of slice) {
        try { await bucket.delete(key); removed.push(key); } catch { failed.push(key); }
      }
    }
  }
  return { removed, failed };
}

export async function deletePrefix(bucket, prefix) {
  return deleteKeys(bucket, await listKeys(bucket, prefix));
}

export async function deleteObject(bucket, key) {
  if (!isSafeMediaKey(key)) throw new Error('Invalid media key');
  await bucket.delete(key);
  return { key };
}

// Đổi slug: copy toàn bộ object sang prefix mới TRƯỚC, chỉ xoá prefix cũ khi copy xong.
// Nếu bất kỳ put nào lỗi → throw và prefix cũ còn nguyên.
export async function copyPrefix(bucket, fromPrefix, toPrefix) {
  const keys = await listKeys(bucket, fromPrefix);
  const copied = [];
  for (const key of keys) {
    const object = await bucket.get(key);
    if (!object) continue;
    const target = `${toPrefix}${key.slice(fromPrefix.length)}`;
    await bucket.put(target, await object.arrayBuffer(), {
      httpMetadata: object.httpMetadata,
    });
    copied.push({ from: key, to: target });
  }
  if (copied.length) await deleteKeys(bucket, copied.map((entry) => entry.from));
  return { copied };
}
