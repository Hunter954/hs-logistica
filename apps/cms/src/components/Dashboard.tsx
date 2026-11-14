import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { BI, RefreshButton } from './AdminUI'

const date = (v: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(v))
const statusLabel: Record<string, string> = { novo: 'Novo', 'em contato': 'Em contato', fechado: 'Fechado', descartado: 'Descartado' }

export async function Dashboard({ initPageResult, params, searchParams, user }: AdminViewServerProps) {
  const { req } = initPageResult
  if (!req.user) redirect('/admin/login')
  const scope = { req, overrideAccess: false as const }
  const [quotes, pending, inContact, published, drafts, media, recentPosts] = await Promise.all([
    req.payload.find({ collection: 'quotes', limit: 5, sort: '-createdAt', depth: 0, ...scope }),
    req.payload.count({ collection: 'quotes', where: { status: { equals: 'novo' } }, ...scope }),
    req.payload.count({ collection: 'quotes', where: { status: { equals: 'em contato' } }, ...scope }),
    req.payload.count({ collection: 'posts', where: { _status: { equals: 'published' } }, ...scope }),
    req.payload.count({ collection: 'posts', where: { _status: { equals: 'draft' } }, ...scope }),
    req.payload.count({ collection: 'media', ...scope }),
    req.payload.find({ collection: 'posts', limit: 3, sort: '-updatedAt', depth: 0, ...scope }),
  ])
  const siteUrl = process.env.SITE_URL || '/'
  const shortcuts = [
    { title: 'Página inicial', text: 'Textos, serviços e apresentação', icon: 'house-door', href: '/admin/globals/home' },
    { title: 'Identidade e contato', text: 'Marca, cores e informações', icon: 'gear', href: '/admin/globals/site-settings' },
    { title: 'Biblioteca de imagens', text: 'Fotos da sua operação', icon: 'images', href: '/admin/collections/media' },
  ]
  const stats = [
    { label: 'Novas cotações', count: pending.totalDocs, note: 'Aguardando primeiro contato', icon: 'chat-left-text', href: '/admin/collections/quotes?where[status][equals]=novo', tone: 'green' },
    { label: 'Em atendimento', count: inContact.totalDocs, note: `${quotes.totalDocs} pedidos recebidos no total`, icon: 'telephone', href: '/admin/collections/quotes?where[status][equals]=em%20contato', tone: 'blue' },
    { label: 'Artigos publicados', count: published.totalDocs, note: `${drafts.totalDocs} rascunhos para trabalhar`, icon: 'file-earmark-text', href: '/admin/collections/posts', tone: 'purple' },
    { label: 'Imagens na biblioteca', count: media.totalDocs, note: 'Arquivos disponíveis para o site', icon: 'images', href: '/admin/collections/media', tone: 'orange' },
  ]
  return <>
    <div className="hs-dashboard">
      <header className="hs-page-heading"><div><div className="hs-eyebrow">SEU CENTRO DE GESTÃO</div><h1>Visão geral</h1><p>Olá, {String(user?.name || 'equipe HS').split(' ')[0]}. Vamos cuidar da sua presença digital?</p></div><RefreshButton /></header>
      <section className="hs-welcome" aria-label="Gerenciar o site"><div className="hs-welcome-copy"><span className="hs-welcome-kicker"><span />HS LOGÍSTICA E ARMAZENAGEM</span><h2>Sua operação em movimento.<br /><em>Seu site também.</em></h2><p>Conte sua história, apresente seus serviços e transforme<br className="hs-desktop-break" /> novos contatos em oportunidades.</p><div className="hs-welcome-actions"><Link className="hs-button hs-button-green" href="/admin/globals/home"><BI name="pencil-square" />Editar página inicial</Link><a className="hs-button hs-button-ghost" href={siteUrl} target="_blank" rel="noopener noreferrer">Abrir site<BI name="arrow-up-right" /></a></div></div><div className="hs-welcome-art" aria-hidden="true"><div className="hs-orbit hs-orbit-one" /><div className="hs-orbit hs-orbit-two" /><div className="hs-art-mark"><BI name="box-seam" /></div><span className="hs-art-label">CONECTANDO POSSIBILIDADES</span><div className="hs-art-dot" /></div></section>
      <section className="hs-stats" aria-label="Resumo do conteúdo">{stats.map(s => <Link href={s.href} key={s.label} className={`hs-stat hs-tone-${s.tone}`}><div className="hs-stat-top"><span>{s.label}</span><span className="hs-stat-icon"><BI name={s.icon} /></span></div><strong>{s.count.toLocaleString('pt-BR')}</strong><small>{s.note}</small></Link>)}</section>
      <div className="hs-main-grid"><section className="hs-panel hs-quotes"><div className="hs-panel-heading"><div><h2>Cotações recentes</h2><p>Novas conexões para o seu negócio.</p></div><Link className="hs-text-link" href="/admin/collections/quotes">Ver todas<BI name="arrow-right" /></Link></div>{quotes.docs.length ? <div className="hs-table-wrap"><table className="hs-table"><thead><tr><th>Cliente / empresa</th><th>Serviço</th><th>Situação</th><th>Recebido</th><th><span className="hs-sr-only">Abrir</span></th></tr></thead><tbody>{quotes.docs.map(q => <tr key={q.id}><td><Link href={`/admin/collections/quotes/${q.id}`}><strong>{q.name}</strong><small>{q.contact}</small></Link></td><td>{q.service || 'Não informado'}</td><td><span className={`hs-status hs-status-${q.status === 'em contato' ? 'contact' : q.status}`}>{statusLabel[q.status] || q.status}</span></td><td>{date(q.createdAt)}</td><td><Link aria-label={`Abrir cotação de ${q.name}`} href={`/admin/collections/quotes/${q.id}`}><BI name="arrow-up-right" /></Link></td></tr>)}</tbody></table></div> : <div className="hs-empty"><span className="hs-empty-icon"><BI name="chat-left-text" /></span><h3>Pronto para novas oportunidades</h3><p>Os pedidos enviados pelo formulário do site<br />aparecerão aqui para sua equipe acompanhar.</p><a href={`${siteUrl}/#contato`} target="_blank" rel="noopener noreferrer" className="hs-text-link">Conhecer o formulário<BI name="arrow-up-right" /></a></div>}<div className="hs-panel-foot"><BI name="shield-check" />Contatos recebidos pelo formulário do seu site.</div></section>
      <section className="hs-panel hs-shortcuts"><div className="hs-panel-heading"><div><h2>Seu site, do seu jeito</h2><p>Acesso direto ao que importa.</p></div></div><div className="hs-shortcut-list">{shortcuts.map(s => <Link key={s.href} className="hs-shortcut" href={s.href}><span className="hs-shortcut-icon"><BI name={s.icon} /></span><span><strong>{s.title}</strong><small>{s.text}</small></span><BI name="arrow-right" /></Link>)}</div><div className="hs-tip"><BI name="check-circle" /><p><strong>Conteúdo sempre atualizado</strong>Ao salvar, as mudanças publicadas são enviadas automaticamente para o site.</p></div></section></div>
      <section className="hs-panel hs-editorial"><div className="hs-panel-heading"><div><h2>Conteúdo em destaque</h2><p>Continue de onde parou no blog.</p></div><Link href="/admin/collections/posts/create" className="hs-button hs-button-light"><BI name="plus-lg" />Novo artigo</Link></div>{recentPosts.docs.length ? <div className="hs-posts">{recentPosts.docs.map(p => <Link href={`/admin/collections/posts/${p.id}`} key={p.id} className="hs-post"><span className="hs-post-icon"><BI name="file-earmark-text" /></span><span><strong>{p.title}</strong><small>Atualizado em {date(p.updatedAt)}</small></span><span className={`hs-status ${p._status === 'published' ? 'hs-status-fechado' : ''}`}>{p._status === 'published' ? 'Publicado' : 'Rascunho'}</span><BI name="arrow-right" /></Link>)}</div> : <div className="hs-editorial-empty"><span className="hs-post-icon"><BI name="file-earmark-text" /></span><div><h3>Boas histórias merecem ser compartilhadas.</h3><p>Publique novidades, dicas e informações sobre a operação da HS.</p></div><Link href="/admin/collections/posts/create" className="hs-text-link">Criar primeiro artigo<BI name="arrow-right" /></Link></div>}</section>
      <footer className="hs-dashboard-footer"><span>HS Logística e Armazenagem</span><span>Conteúdo bem cuidado. Negócios em movimento.</span></footer>
    </div>
  </>
}
