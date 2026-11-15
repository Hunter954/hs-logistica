import type { FieldHook } from 'payload'

export const slugify = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

/** Preenche o endereço a partir do título quando ele está vazio; se foi digitado, só normaliza. */
export const slugFrom = (source: string): FieldHook => ({ value, data }) => {
  const typed = typeof value === 'string' ? value.trim() : ''
  return slugify(typed || String(data?.[source] || '')) || null
}
