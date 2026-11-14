// Converte o que o Payload devolve (globals e posts) no formato que as seções do site usam.
// É o único lugar que conhece a forma dos dados do CMS.
import type { Home, SiteSetting, Post as CmsPost, Media, Category } from '@hs/types'
import { DEFAULT as V2 } from './v2'
import type { Content, Img, ImgSize, Post, PostCard, Cat } from './model'

const HEX = /^#[0-9a-fA-F]{6}$/
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v.trim() ? v : fallback)

export function image(m: unknown): Img | null {
  if (!m || typeof m !== 'object') return null
  const d = m as Media
  if (!d.url) return null
  const sizes: Img['sizes'] = {}
  for (const k of ['thumb', 'card', 'hero', 'og'] as const) {
    const s = d.sizes?.[k]
    if (s?.url && s.width && s.height) sizes[k] = { url: s.url, width: s.width, height: s.height } satisfies ImgSize
  }
  return { url: d.url, alt: d.alt || '', width: d.width || 0, height: d.height || 0, sizes }
}

const items = <T>(list: T[] | null | undefined, fallback: T[]): T[] => (list && list.length ? list : fallback)

/** Site ainda sem conteúdo no CMS (ou CMS fora do ar no build): vale o texto padrão da v2. */
export function fallbackContent(cmsUrl = ''): Content {
  return {
    brand: { ...V2.brand, logo: null, logoWidth: 77, showName: true }, hero: { ...V2.hero, photo: null }, services: V2.services, photos: [],
    navigation: { cta: V2.hero.cta1, items: [{ label: 'Serviços', target: 'servicos' }, { label: 'Localização', target: 'localizacao' }, { label: 'Empresa', target: 'empresa' }, { label: 'Blog', target: 'blog' }, { label: 'Dúvidas', target: 'duvidas' }] },
    sections: { services: true, photos: true, where: true, steps: true, about: true, blog: true, faq: true, blogTitle: 'Do blog', blogLink: 'Ver todos os posts' },
    quoteForm: { button: 'Enviar pedido de cotação', messagePlaceholder: 'Produto, volume e prazo', successMessage: 'Pedido de cotação recebido. Entraremos em contato.' },
    footerOptions: { showAdminLink: true, adminLabel: 'Área do cliente' },
    where: V2.where, steps: V2.steps, about: V2.about, faq: V2.faq, contact: V2.contact, footer: V2.footer, theme: V2.theme,
    seo: { title: `${V2.brand.name} ${V2.brand.tag} | Foz do Iguaçu`, description: V2.hero.sub, image: null },
    latest: [], cmsUrl,
  }
}

export function fromCms(home: Home | null, s: SiteSetting | null, latest: PostCard[], cmsUrl = ''): Content {
  const d = fallbackContent(cmsUrl)
  if (!home?.hero?.title || !s?.brand?.name) return { ...d, latest }
  const t = s.theme
  return {
    brand: { name: s.brand.name, tag: str(s.brand.tag), logo: image(s.brand.logo), logoWidth: Math.max(40, Math.min(180, s.brand.logoWidth || 77)), showName: s.brand.showName !== false },
    navigation: { cta: str(s.navigation?.cta, d.navigation.cta), items: s.navigation?.items?.map(i => ({ label: i.label, target: i.target })) ?? d.navigation.items },
    sections: { ...d.sections, ...Object.fromEntries(Object.entries(home.sections || {}).filter(([, v]) => v !== null && v !== undefined)) },
    quoteForm: { button: str(home.quoteForm?.button, d.quoteForm.button), messagePlaceholder: str(home.quoteForm?.messagePlaceholder, d.quoteForm.messagePlaceholder), successMessage: str(home.quoteForm?.successMessage, d.quoteForm.successMessage) },
    footerOptions: { showAdminLink: s.footerOptions?.showAdminLink !== false, adminLabel: str(s.footerOptions?.adminLabel, d.footerOptions.adminLabel) },
    hero: {
      title: home.hero.title, title2: str(home.hero.title2), sub: str(home.hero.sub), cta1: str(home.hero.cta1, d.hero.cta1), cta2: str(home.hero.cta2, d.hero.cta2),
      facts: (home.hero.facts || []).map((f) => f.text).filter(Boolean), photo: image(home.hero.photo),
    },
    services: { title: home.services.title, lead: str(home.services.lead), items: items(home.services.items, []).map(({ t: a, d: b }) => ({ t: a, d: b })) },
    photos: (home.photos || []).map((p) => image(p.image)).filter((p): p is Img => !!p),
    where: { title: home.where.title, lead: str(home.where.lead), items: items(home.where.items, []).map(({ t: a, d: b }) => ({ t: a, d: b })) },
    steps: { title: home.steps.title, items: items(home.steps.items, []).map(({ t: a, d: b }) => ({ t: a, d: b })) },
    about: { title: home.about.title, text: str(home.about.text), facts: (home.about.facts || []).map(({ k, v }) => ({ k, v })) },
    faq: { title: home.faq.title, items: (home.faq.items || []).map(({ q, a }) => ({ q, a })) },
    contact: {
      title: str(home.quoteForm?.title, d.contact.title), sub: str(home.quoteForm?.sub, d.contact.sub),
      address: str(s.contact?.address), phone: str(s.contact?.phone), whatsapp: str(s.contact?.whatsapp), email: str(s.contact?.email), hours: str(s.contact?.hours),
    },
    footer: str(s.footer, d.footer),
    // cor fora do formato não entra no CSS nem na cena
    theme: { accent: HEX.test(t?.accent || '') ? t!.accent : d.theme.accent, ink: HEX.test(t?.ink || '') ? t!.ink : d.theme.ink, paper: HEX.test(t?.paper || '') ? t!.paper : d.theme.paper },
    seo: {
      title: str(home.meta?.title, str(s.seo?.title, d.seo.title)), description: str(home.meta?.description, str(s.seo?.description, d.seo.description)),
      image: image(home.meta?.image) || image(s.seo?.image),
    },
    latest, cmsUrl,
  }
}

const cats = (list: CmsPost['categories']): Cat[] =>
  (list || []).filter((c): c is Category => !!c && typeof c === 'object').map((c) => ({ title: c.title, slug: str(c.slug) })).filter((c) => c.slug)

type WithComputed = CmsPost & { contentHtml?: string | null; readingMinutes?: number | null; authorName?: string | null }

/** Só entra o que está publicado e tem endereço; rascunho nunca chega às páginas. */
export function post(raw: CmsPost): Post | null {
  const p = raw as WithComputed
  if (p._status !== 'published' || !p.slug) return null
  const cover = image(p.cover)
  return {
    id: p.id, slug: p.slug, title: p.title, excerpt: str(p.excerpt), cover, date: p.publishedAt || p.createdAt, updated: p.updatedAt,
    categories: cats(p.categories), minutes: p.readingMinutes || 1, html: p.contentHtml || '', author: str(p.authorName),
    seo: { title: str(p.meta?.title, p.title), description: str(p.meta?.description, str(p.excerpt)), image: image(p.meta?.image) || cover },
  }
}
export const card = ({ id, slug, title, excerpt, cover, date, categories, minutes }: Post): PostCard => ({ id, slug, title, excerpt, cover, date, categories, minutes })
