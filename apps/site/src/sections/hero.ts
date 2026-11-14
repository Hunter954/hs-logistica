import { esc, picture, ARROW, type Ctx } from './html'
import { poster } from './poster'

export const hero = ({ c }: Ctx): string => `
<div class="hero" id="inicio">
  <div class="hero-text">
    <h1><span>${esc(c.hero.title)}</span> <span class="hl">${esc(c.hero.title2)}</span></h1>
    <p class="sub">${esc(c.hero.sub)}</p>
    <div class="cta"><a class="btn btn-primary" href="#contato"><span>${esc(c.hero.cta1)}</span>${ARROW}</a>${c.sections.services ? `<a class="btn btn-line" href="#servicos"><span>${esc(c.hero.cta2)}</span></a>` : ''}</div>
    <div class="fact">${c.hero.facts.map((f) => `<b>${esc(f)}</b>`).join('')}</div>
  </div>
  <div class="panel">
    ${c.hero.photo ? picture(c.hero.photo, '(max-width: 940px) 100vw, 46vw', 'cover', false) : poster(c)}
  </div>
</div>`
