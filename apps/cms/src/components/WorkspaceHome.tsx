import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import {
  activeUser,
  hasPermission,
  isAdmin,
  ROLE_LABELS,
} from '../lib/permissions'
import { BI, RefreshButton } from './AdminUI'

export async function WorkspaceHome({
  initPageResult,
  user,
}: AdminViewServerProps) {
  const { req } = initPageResult
  if (!activeUser(req.user)) redirect('/admin/login')
  const quotesAccess = hasPermission(req.user, 'quotes'),
    blogAccess = hasPermission(req.user, 'blog'),
    siteAccess = hasPermission(req.user, 'site'),
    brandAccess = hasPermission(req.user, 'brand'),
    mediaAccess = hasPermission(req.user, 'media')
  const scope = { req, overrideAccess: false as const }
  const [quotes, pending, overdue, articles, images] = await Promise.all([
    quotesAccess
      ? req.payload.find({
          collection: 'quotes',
          limit: 5,
          sort: '-createdAt',
          depth: 0,
          ...scope,
        })
      : null,
    quotesAccess
      ? req.payload.count({
          collection: 'quotes',
          where: { status: { equals: 'novo' } },
          ...scope,
        })
      : null,
    quotesAccess
      ? req.payload.count({
          collection: 'quotes',
          where: {
            and: [
              { followUp: { less_than: new Date().toISOString() } },
              { status: { in: ['novo', 'em contato'] } },
            ],
          },
          ...scope,
        })
      : null,
    blogAccess
      ? req.payload.find({
          collection: 'posts',
          limit: 3,
          sort: '-updatedAt',
          depth: 0,
          ...scope,
        })
      : null,
    mediaAccess ? req.payload.count({ collection: 'media', ...scope }) : null,
  ])
  const actions = [
    ...(siteAccess
      ? [
          {
            label: 'Editar página inicial',
            text: 'Abertura, serviços, fotos, empresa e formulário',
            icon: 'pencil-square',
            href: '/admin/site?section=hero',
          },
        ]
      : []),
    ...(brandAccess
      ? [
          {
            label: 'Cabeçalho e logomarca',
            text: 'Marca, navegação, contato e rodapé',
            icon: 'house-door',
            href: '/admin/site?section=header',
          },
        ]
      : []),
    ...(quotesAccess
      ? [
          {
            label: 'Atender pedidos recebidos',
            text: 'Organizar cotações, responsáveis e retornos',
            icon: 'chat-left-text',
            href: '/admin/inbox',
          },
        ]
      : []),
    ...(blogAccess
      ? [
          {
            label: 'Gerenciar artigos',
            text: 'Rascunhos, categorias e publicações do blog',
            icon: 'file-earmark-text',
            href: '/admin/collections/posts',
          },
        ]
      : []),
    ...(mediaAccess
      ? [
          {
            label: 'Biblioteca de imagens',
            text: 'Fotos, textos alternativos e arquivos em uso',
            icon: 'images',
            href: '/admin/collections/media',
          },
        ]
      : []),
    ...(isAdmin(req.user)
      ? [
          {
            label: 'Equipe e permissões',
            text: 'Contas, perfis e limites de acesso',
            icon: 'people',
            href: '/admin/team',
          },
        ]
      : []),
  ]
  const stats = [
    ...(pending
      ? [
          {
            label: 'Novos pedidos',
            count: pending.totalDocs,
            note: 'Aguardando primeiro contato',
            icon: 'chat-left-text',
            href: '/admin/inbox?status=novo',
            tone: 'green',
          },
        ]
      : []),
    ...(overdue
      ? [
          {
            label: 'Retornos atrasados',
            count: overdue.totalDocs,
            note: 'Atendimentos que pedem atenção',
            icon: 'clock',
            href: '/admin/inbox?overdue=1',
            tone: 'orange',
          },
        ]
      : []),
    ...(articles
      ? [
          {
            label: 'Artigos no blog',
            count: articles.totalDocs,
            note: 'Publicados e rascunhos da equipe',
            icon: 'file-earmark-text',
            href: '/admin/collections/posts',
            tone: 'purple',
          },
        ]
      : []),
    ...(images
      ? [
          {
            label: 'Imagens disponíveis',
            count: images.totalDocs,
            note: 'Sua biblioteca de mídia',
            icon: 'images',
            href: '/admin/collections/media',
            tone: 'blue',
          },
        ]
      : []),
  ]
  return (
    <div className="hs-workspace">
      <header className="hs-page-heading">
        <div>
          <span className="hs-eyebrow">
            {ROLE_LABELS[req.user!.role || ''] || 'ÁREA DE TRABALHO'}
          </span>
          <h1>Olá, {String(user?.name || 'equipe HS').split(' ')[0]}.</h1>
          <p>Seu trabalho organizado, suas próximas ações à mão.</p>
        </div>
        <RefreshButton />
      </header>
      <section className="hs-welcome">
        <div className="hs-welcome-copy">
          <span className="hs-welcome-kicker">
            <span />
            HS LOGÍSTICA E ARMAZENAGEM
          </span>
          <h2>
            Sua operação em movimento.
            <br />
            <em>Uma gestão conectada.</em>
          </h2>
          <p>
            Conteúdo, relacionamento e equipe.
            <br />
            Cada área com o fluxo certo para o seu trabalho.
          </p>
          <div className="hs-welcome-actions">
            {actions[0] && (
              <Link
                className="hs-button hs-button-green"
                href={actions[0].href}
              >
                <BI name={actions[0].icon} />
                {actions[0].label}
              </Link>
            )}
            <a
              className="hs-button hs-button-ghost"
              href={process.env.SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver site
              <BI name="arrow-up-right" />
            </a>
          </div>
        </div>
        <div className="hs-welcome-art" aria-hidden="true">
          <div className="hs-orbit hs-orbit-one" />
          <div className="hs-orbit hs-orbit-two" />
          <div className="hs-art-mark">
            <BI name="box-seam" />
          </div>
        </div>
      </section>
      {!!stats.length && (
        <section className="hs-stats hs-work-stats">
          {stats.map((s) => (
            <Link
              href={s.href}
              key={s.label}
              className={`hs-stat hs-tone-${s.tone}`}
            >
              <div className="hs-stat-top">
                <span>{s.label}</span>
                <span className="hs-stat-icon">
                  <BI name={s.icon} />
                </span>
              </div>
              <strong>{s.count}</strong>
              <small>{s.note}</small>
            </Link>
          ))}
        </section>
      )}
      <div className="hs-main-grid">
        <section className="hs-panel">
          <div className="hs-panel-heading">
            <div>
              <h2>O que você precisa fazer?</h2>
              <p>Atalhos das áreas liberadas para o seu perfil.</p>
            </div>
          </div>
          <div className="hs-dashboard-actions">
            {actions.map((a) => (
              <Link className="hs-shortcut" key={a.href} href={a.href}>
                <span className="hs-shortcut-icon">
                  <BI name={a.icon} />
                </span>
                <span>
                  <strong>{a.label}</strong>
                  <small>{a.text}</small>
                </span>
                <BI name="arrow-right" />
              </Link>
            ))}
            {!actions.length && (
              <p>
                Seu perfil ainda não tem áreas atribuídas. Fale com um
                administrador.
              </p>
            )}
          </div>
        </section>
        <section className="hs-panel">
          <div className="hs-panel-heading">
            <div>
              <h2>
                {quotes ? 'Pedidos mais recentes' : 'Seu espaço de trabalho'}
              </h2>
              <p>
                {quotes
                  ? 'Os contatos que chegaram pelo formulário.'
                  : 'Seu acesso acompanha suas responsabilidades.'}
              </p>
            </div>
            {quotes && (
              <Link className="hs-text-link" href="/admin/inbox">
                Ver caixa de entrada
                <BI name="arrow-right" />
              </Link>
            )}
          </div>
          {quotes?.docs.length ? (
            <div className="hs-dashboard-actions">
              {quotes.docs.map((q) => (
                <Link
                  className="hs-shortcut"
                  key={q.id}
                  href={'/admin/inbox?id=' + q.id}
                >
                  <span className="hs-shortcut-icon">
                    <BI name="chat-left-text" />
                  </span>
                  <span>
                    <strong>{q.name}</strong>
                    <small>
                      {q.service || 'Cotação'} · {q.status}
                    </small>
                  </span>
                  <BI name="arrow-up-right" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="hs-empty">
              <span className="hs-empty-icon">
                <BI name={quotes ? 'chat-left-text' : 'shield-check'} />
              </span>
              <h3>
                {quotes
                  ? 'Pronto para novas oportunidades'
                  : 'Tudo no seu lugar'}
              </h3>
              <p>
                {quotes
                  ? 'Novos pedidos aparecem automaticamente aqui. Acompanhe o atendimento na caixa de entrada.'
                  : 'Use os atalhos ao lado para trabalhar no site. Sua conta só exibe as áreas permitidas.'}
              </p>
            </div>
          )}
        </section>
      </div>
      {articles && (
        <section className="hs-panel">
          <div className="hs-panel-heading">
            <div>
              <h2>Continue no blog</h2>
              <p>Artigos atualizados recentemente.</p>
            </div>
            <Link
              href="/admin/collections/posts/create"
              className="hs-button hs-button-light"
            >
              <BI name="plus-lg" />
              Novo artigo
            </Link>
          </div>
          <div className="hs-posts">
            {articles.docs.map((p) => (
              <Link
                className="hs-post"
                href={'/admin/collections/posts/' + p.id}
                key={p.id}
              >
                <span className="hs-post-icon">
                  <BI name="file-earmark-text" />
                </span>
                <strong>{p.title}</strong>
                <span className="hs-status">
                  {p._status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
                <BI name="arrow-right" />
              </Link>
            ))}
            {!articles.docs.length && (
              <p className="hs-workspace-note">
                O primeiro artigo pode apresentar os serviços, a equipe ou
                novidades da operação.
              </p>
            )}
          </div>
        </section>
      )}
      <footer className="hs-dashboard-footer">
        <span>HS Logística e Armazenagem</span>
        <span>Conteúdo e atendimento em movimento.</span>
      </footer>
    </div>
  )
}
