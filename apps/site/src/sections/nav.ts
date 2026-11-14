import { esc, logoSrc, type Ctx } from './html'

/** `home` é o prefixo das âncoras: vazio na página inicial, "/" nas páginas do blog. */
export const nav = ({ c }: Ctx, home = ''): string => {
  const sections: Record<string, boolean> = { servicos: c.sections.services, localizacao: c.sections.where, etapas: c.sections.steps, empresa: c.sections.about, duvidas: c.sections.faq, contato: true, blog: true }
  const links = c.navigation.items.filter(i => sections[i.target]).map(i => `<a href="${i.target === 'blog' ? '/blog' : home + '#' + i.target}">${esc(i.label)}</a>`).join('')
  return `
<header class="nav-bar"><div class="wrap nav">
  <a class="logo" href="${home || '#inicio'}"><img src="${esc(logoSrc(c))}" alt="${esc(c.brand.name)}" width="${c.brand.logoWidth}" height="44" style="width:${c.brand.logoWidth}px;height:auto;max-height:64px;object-fit:contain">${c.brand.showName ? `<span>${esc(c.brand.name)}<small>${esc(c.brand.tag)}</small></span>` : ''}</a>
  <nav aria-label="Seções">${links}</nav>
  <a class="btn btn-primary btn-sm" href="${home}#contato">${esc(c.navigation.cta)}</a>
  ${links ? `<details class="site-mobile-menu"><summary aria-label="Abrir menu de navegação"><span aria-hidden="true">☰</span></summary><nav aria-label="Navegação móvel">${links}</nav></details>` : ''}
</div></header>`
}
