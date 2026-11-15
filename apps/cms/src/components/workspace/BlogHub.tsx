'use client'
import React from 'react'
import Link from 'next/link'
import { BI } from '../AdminUI'
import { formatDate, Loading, Notice, request, useWorkspace } from './shared'

export function BlogHub() {
  const { data: workspace } = useWorkspace()
  const [status, setStatus] = React.useState(''),
    [search, setSearch] = React.useState(''),
    [mine, setMine] = React.useState(false),
    [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<any>(null),
    [loading, setLoading] = React.useState(true),
    [error, setError] = React.useState(''),
    [revision, refresh] = React.useState(0)
  React.useEffect(() => {
    if (!workspace) return
    let live = true
    const timer = setTimeout(() => {
      setLoading(true)
      const q = new URLSearchParams({
        limit: '15',
        page: String(page),
        sort: '-updatedAt',
        depth: '1',
        draft: 'true',
      })
      if (status) q.set('where[_status][equals]', status)
      if (search.trim()) q.set('where[title][contains]', search.trim())
      if (mine) q.set('where[author][equals]', workspace.user.id)
      request('/api/posts?' + q)
        .then((d) => {
          if (live) setData(d)
        })
        .catch((e) => {
          if (live) setError(e.message)
        })
        .finally(() => {
          if (live) setLoading(false)
        })
    }, 250)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [workspace, status, search, mine, page, revision])
  async function changeStatus(post: any) {
    const next = post._status === 'published' ? 'draft' : 'published'
    if (
      !window.confirm(
        next === 'published'
          ? 'Publicar este artigo no site agora?'
          : 'Retirar este artigo do site e voltar para rascunho?',
      )
    )
      return
    setError('')
    try {
      await request('/api/posts/' + post.id, {
        method: 'PATCH',
        body: JSON.stringify({ _status: next }),
      })
      await request('/api/site-sync', { method: 'POST' })
      refresh((v) => v + 1)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <div className="hs-workspace">
      <header className="hs-page-heading">
        <div>
          <span className="hs-eyebrow">CONTEÚDO EDITORIAL</span>
          <h1>Artigos e publicações</h1>
          <p>Escreva, revise e publique as novidades da HS.</p>
        </div>
        <div className="hs-actions">
          <Link
            className="hs-button hs-button-light"
            href="/admin/collections/categories"
          >
            <BI name="tag" />
            Categorias
          </Link>
          <Link
            className="hs-button hs-button-green"
            href="/admin/collections/posts/create"
          >
            <BI name="plus-lg" />
            Novo artigo
          </Link>
        </div>
      </header>
      <Notice text={error} />
      <div className="hs-editorial-flow">
        <span>
          <BI name="pencil-square" />
          1. Escrever o rascunho
        </span>
        <BI name="arrow-right" />
        <span>
          <BI name="check-circle" />
          2. Revisar texto e imagens
        </span>
        <BI name="arrow-right" />
        <span>
          <BI name="globe2" />
          3. Publicar no site
        </span>
      </div>
      {workspace && !workspace.permissions.includes('publish') && (
        <div className="hs-notice hs-notice-success">
          Seu perfil pode trabalhar nos rascunhos. A publicação é feita por
          alguém com a permissão de publicar.
        </div>
      )}
      <section className="hs-panel">
        <div className="hs-filters hs-team-filters">
          <label>
            Buscar artigo
            <input
              value={search}
              placeholder="Título do artigo"
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </label>
          <label>
            Situação
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Todos</option>
              <option value="draft">Rascunhos</option>
              <option value="published">Publicados</option>
            </select>
          </label>
          <label>
            Autoria
            <select
              value={mine ? 'mine' : ''}
              onChange={(e) => {
                setMine(e.target.value === 'mine')
                setPage(1)
              }}
            >
              <option value="">Toda a equipe</option>
              <option value="mine">Meus artigos</option>
            </select>
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : !data?.docs.length ? (
          <div className="hs-empty">
            <span className="hs-empty-icon">
              <BI name="file-earmark-text" />
            </span>
            <h3>
              {search || status || mine
                ? 'Nenhum artigo com esses filtros'
                : 'Sua próxima história começa aqui'}
            </h3>
            <p>Crie um rascunho e revise o conteúdo antes de publicar.</p>
          </div>
        ) : (
          <div className="hs-blog-list">
            {data.docs.map((p: any) => (
              <article key={p.id}>
                <div className="hs-blog-thumb">
                  {p.cover?.url ? (
                    <img
                      src={p.cover.sizes?.thumb?.url || p.cover.url}
                      alt={p.cover.alt}
                    />
                  ) : (
                    <BI name="file-earmark-text" />
                  )}
                </div>
                <div>
                  <span
                    className={
                      'hs-status ' +
                      (p._status === 'published' ? 'hs-status-fechado' : '')
                    }
                  >
                    {p._status === 'published' ? 'Publicado' : 'Rascunho'}
                  </span>
                  <h2>
                    <Link href={'/admin/collections/posts/' + p.id}>
                      {p.title || 'Rascunho sem título'}
                    </Link>
                  </h2>
                  <p>
                    {p.excerpt ||
                      'Adicione um resumo para apresentar este artigo.'}
                  </p>
                  <small>
                    Atualizado em {formatDate(p.updatedAt)}
                    {p.categories?.length
                      ? ' · ' +
                        p.categories
                          .map((c: any) => c.title)
                          .filter(Boolean)
                          .join(', ')
                      : ''}
                  </small>
                </div>
                <div className="hs-blog-actions">
                  <Link
                    className="hs-button hs-button-light"
                    href={'/admin/collections/posts/' + p.id}
                  >
                    Editar artigo
                  </Link>
                  {workspace?.permissions.includes('publish') && (
                    <button
                      className="hs-text-button"
                      onClick={() => changeStatus(p)}
                    >
                      {p._status === 'published'
                        ? 'Voltar para rascunho'
                        : 'Publicar'}
                    </button>
                  )}
                  {p._status === 'published' && (
                    <a
                      className="hs-text-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={workspace?.siteUrl + '/blog/' + p.slug}
                    >
                      Ver no site
                      <BI name="arrow-up-right" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="hs-pagination">
          <span>
            {data?.totalDocs || 0} artigo(s) · página {page}
          </span>
          <div>
            <button
              className="hs-button hs-button-light"
              disabled={page <= 1}
              onClick={() => setPage((v) => v - 1)}
            >
              Anterior
            </button>
            <button
              className="hs-button hs-button-light"
              disabled={!data?.hasNextPage}
              onClick={() => setPage((v) => v + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
