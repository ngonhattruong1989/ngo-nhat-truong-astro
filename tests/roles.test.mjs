import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FILM_ROLES, normalizeRoles, hasRole, filterByRole, filmPath, parseFilmPath, rolePageCopy, roleLabel,
  groupFilmsByRole, collapseMenu, expandMenu,
} from '../src/lib/cms/roles.mjs';

test('normalizeRoles keeps the two known roles, deduped and ordered', () => {
  assert.deepEqual(normalizeRoles(['production-designer', 'actor', 'actor']), ['actor', 'production-designer']);
  assert.deepEqual(normalizeRoles(['guest']), []);
  assert.deepEqual(normalizeRoles(undefined), []);
  assert.deepEqual(FILM_ROLES, ['actor', 'production-designer']);
});

test('filterByRole selects the projects assigned to a role, and keeps all when no role', () => {
  const items = [
    { id: 'a', roles: ['actor'] },
    { id: 'b', roles: ['production-designer'] },
    { id: 'c', roles: ['actor', 'production-designer'] },
    { id: 'd' },
  ];
  assert.deepEqual(filterByRole(items, 'actor').map((i) => i.id), ['a', 'c']);
  assert.deepEqual(filterByRole(items, 'production-designer').map((i) => i.id), ['b', 'c']);
  assert.deepEqual(filterByRole(items, '').map((i) => i.id), ['a', 'b', 'c', 'd']);
  assert.equal(hasRole(items[2], 'actor'), true);
  assert.equal(hasRole(items[3], 'actor'), false);
});

test('filmPath builds role-scoped URLs and keeps the legacy detail URL', () => {
  assert.equal(filmPath({ role: 'actor' }), '/films/actor');
  assert.equal(filmPath({ role: 'actor', id: 'phuc-sinh' }), '/films/actor/phuc-sinh');
  assert.equal(filmPath({ role: 'production-designer', id: 'unnamed' }), '/films/production-designer/unnamed');
  assert.equal(filmPath({ id: 'phuc-sinh' }), '/films/phuc-sinh');
  assert.equal(filmPath({}), '/films');
  assert.equal(filmPath({ role: 'nonsense', id: 'x' }), '/films/x');
});

test('parseFilmPath understands role pages, role details and legacy details', () => {
  assert.deepEqual(parseFilmPath('/films/actor'), { role: 'actor', id: '' });
  assert.deepEqual(parseFilmPath('/films/actor/phuc-sinh'), { role: 'actor', id: 'phuc-sinh' });
  assert.deepEqual(parseFilmPath('/films/production-designer/unnamed/'), { role: 'production-designer', id: 'unnamed' });
  assert.deepEqual(parseFilmPath('/films/phuc-sinh'), { role: '', id: 'phuc-sinh' });
  assert.deepEqual(parseFilmPath('/films'), { role: '', id: '' });
  assert.equal(parseFilmPath('/music'), null);
});

test('rolePageCopy prefers the role-specific copy and falls back to the films page', () => {
  const payload = { title: 'phim', description: 'tất cả', rolePages: { actor: { title: 'diễn viên' } } };
  assert.deepEqual(rolePageCopy(payload, 'actor'), { title: 'diễn viên', description: 'tất cả' });
  assert.deepEqual(rolePageCopy(payload, 'production-designer'), { title: 'phim', description: 'tất cả' });
  assert.deepEqual(rolePageCopy({}, 'actor'), { title: '', description: '' });
});

test('groupFilmsByRole keeps the two role groups plus the unassigned bucket', () => {
  const items = [
    { id: 'a', roles: ['actor'] },
    { id: 'b', roles: ['production-designer'] },
    { id: 'c', roles: ['actor', 'production-designer'] },
    { id: 'd' },
  ];
  const { groups, unassigned } = groupFilmsByRole(items);
  assert.deepEqual(groups.map((g) => g.role), ['actor', 'production-designer']);
  assert.deepEqual(groups[0].items.map((i) => i.id), ['a', 'c']);
  assert.deepEqual(groups[1].items.map((i) => i.id), ['b', 'c']);
  assert.deepEqual(unassigned.map((i) => i.id), ['d']);
});

test('menu keeps a single films entry, whichever direction it is migrated', () => {
  const base = ['trang chủ', 'về tôi', 'phim', 'nhạc', 'tranh'];
  const expanded = expandMenu(base, 'vi');
  assert.equal(expanded.length, 6);
  assert.deepEqual(expanded.slice(2, 4), ['diễn viên', 'production designer']);
  assert.deepEqual(collapseMenu(expanded, 'vi'), base);
  assert.deepEqual(collapseMenu(base, 'vi'), base, 'idempotent');
  const enBase = ['home', 'about', 'films', 'music'];
  assert.equal(collapseMenu(expandMenu(enBase, 'en'), 'en')[2], 'films');
});

test('roleLabel localises the role names', () => {
  assert.equal(roleLabel('actor', 'vi'), 'Diễn viên');
  assert.equal(roleLabel('actor', 'fr'), 'Acteur');
  assert.equal(roleLabel('production-designer', 'en'), 'Production designer');
});
