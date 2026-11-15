import { esc, picture, fmtDate, ARROW, type Ctx } from './html'
import type { PostCard } from '../content/model'

/** Cartão de post, usado na página inicial e na lista do blog. */
export const postCard = (p: PostCard, heading = 'h3'): string => `
<article class="post-card">
  <a class="post-card__link" href="/blog/${esc(p.slug)}">
    ${p.cover ? `<div class="post-card__cover">${picture(p.cover, '(max-width: 700px) 100vw, 33vw')}</div>` : ''}
    <p class="post-card__meta">${p.categories[0] ? `<span>${esc(p.categories[0].title)}</span>` : ''}<time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time></p>
    <${heading}>${esc(p.title)}</${heading}>
    ${p.excerpt ? `<p>${esc(p.excerpt)}</p>` : ''}
  </a>
</article>`

/** "Do blog": os três posts mais recentes. Sem posts publicados, a seção não aparece. */
export const blog = ({ c }: Ctx): string => (c.latest.length ? `
<section id="blog" class="veil-full"><div class="wrap">
  <div class="head head--row"><h2>${esc(c.sections.blogTitle)}</h2><a class="more" href="/blog"><span>${esc(c.sections.blogLink)}</span>${ARROW}</a></div>
  <div class="post-grid">${c.latest.map((p) => postCard(p)).join('')}</div>
</div></section>` : '')
