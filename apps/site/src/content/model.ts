// Formato de conteúdo que o site usa. É o da v2, com as imagens vindas do CMS no lugar do base64
// e, de novo, os posts do blog.
export interface Item { t: string; d: string }
export interface Fact { k: string; v: string }
export interface Qa { q: string; a: string }
export interface ImgSize { url: string; width: number; height: number }
export interface Img { url: string; alt: string; width: number; height: number; sizes: Partial<Record<'thumb' | 'card' | 'hero' | 'og', ImgSize>> }
export interface Cat { title: string; slug: string }

export interface PostCard { id: number; slug: string; title: string; excerpt: string; cover: Img | null; date: string; categories: Cat[]; minutes: number }
export interface Post extends PostCard {
  html: string; author: string; updated: string
  seo: { title: string; description: string; image: Img | null }
}

export interface Content {
  brand: { name: string; tag: string; logo: Img | null; logoWidth: number; showName: boolean }
  navigation: { cta: string; items: { label: string; target: string }[] }
  sections: { services: boolean; photos: boolean; where: boolean; steps: boolean; about: boolean; blog: boolean; faq: boolean; blogTitle: string; blogLink: string }
  quoteForm: { button: string; messagePlaceholder: string; successMessage: string }
  footerOptions: { showAdminLink: boolean; adminLabel: string }
  hero: { title: string; title2: string; sub: string; cta1: string; cta2: string; facts: string[]; photo: Img | null }
  services: { title: string; lead: string; items: Item[] }
  photos: Img[]
  where: { title: string; lead: string; items: Item[] }
  steps: { title: string; items: Item[] }
  about: { title: string; text: string; facts: Fact[] }
  faq: { title: string; items: Qa[] }
  contact: { title: string; sub: string; address: string; phone: string; whatsapp: string; email: string; hours: string }
  footer: string
  theme: { accent: string; ink: string; paper: string }
  seo: { title: string; description: string; image: Img | null }
  /** Os três posts mais recentes, para a seção "Do blog" da página inicial. */
  latest: PostCard[]
  /** Endereço público do CMS, para o link do painel no rodapé. */
  cmsUrl: string
}
