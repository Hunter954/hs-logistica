'use client'
import React from 'react'
import Link from 'next/link'
import { BI } from '../AdminUI'
import { formatDate, Loading, Modal, Notice, request, useUnsaved } from './shared'

const AREAS: Record<string, string> = { posts: 'Artigos', categories: 'Categorias', media: 'Imagens', users: 'Equipe', quotes: 'Pedidos', home: 'Página inicial', 'site-settings': 'Identidade do site', redirects: 'Redirecionamentos' }
function useRecords(collection: string, searchField: string, extra = '') {
  const [search, setSearch] = React.useState(''), [page, setPage] = React.useState(1), [revision, refresh] = React.useState(0)
  const [data, setData] = React.useState<any>(null), [loading, setLoading] = React.useState(true), [error, setError] = React.useState('')
  React.useEffect(() => {
    let live = true
    const timer = setTimeout(() => {
      setLoading(true); setError('')
      const q = new URLSearchParams({ limit: '18', page: String(page), depth: '1', sort: '-createdAt' })
      if (search.trim()) q.set(`where[${searchField}][contains]`, search.trim())
      request(`/api/${collection}?${q}${extra}`).then(d => { if (live) setData(d) }).catch(e => { if (live) setError(e.message) }).finally(() => { if (live) setLoading(false) })
    }, 250)
    return () => { live = false; clearTimeout(timer) }
  }, [collection, searchField, search, page, revision, extra])
  return { search, setSearch: (s: string) => { setSearch(s); setPage(1) }, page, setPage, data, loading, error, setError, refresh: () => refresh(v => v + 1) }
}
type Records = ReturnType<typeof useRecords>
function Pager({ records: r }: { records: Records }) {
  return <div className="hs-pagination"><span>{r.data?.totalDocs || 0} registro(s) · Página {r.page} de {r.data?.totalPages || 1}</span><div><button className="hs-button hs-button-light" disabled={r.loading || r.page <= 1} onClick={() => r.setPage(v => v - 1)}>Anterior</button><button className="hs-button hs-button-light" disabled={r.loading || !r.data?.hasNextPage} onClick={() => r.setPage(v => v + 1)}>Próxima</button></div></div>
}
function Heading({ label, title, description, children }: { label: string; title: string; description: string; children?: React.ReactNode }) {
  return <header className="hs-page-heading"><div><span className="hs-eyebrow">{label}</span><h1>{title}</h1><p>{description}</p></div><div className="hs-actions">{children}</div></header>
}
function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="hs-empty"><span className="hs-empty-icon"><BI name={icon} /></span><h3>{title}</h3><p>{text}</p></div>
}

export function MediaLibrary() {
  const r = useRecords('media', 'alt')
  const [editing, setEditing] = React.useState<any>(null), [success, setSuccess] = React.useState('')
  return <div className="hs-workspace"><Heading label="BIBLIOTECA DO SITE" title="Imagens" description="Organize os arquivos usados na página inicial e nos artigos."><button className="hs-button hs-button-green" onClick={() => setEditing({})}><BI name="plus-lg" />Enviar imagem</button></Heading>
    <Notice text={r.error} /><Notice text={success} kind="success" />
    <section className="hs-panel"><div className="hs-management-toolbar"><label>Buscar imagem<input placeholder="Descrição da imagem" value={r.search} onChange={e => r.setSearch(e.target.value)} /></label><p>JPG, PNG, WebP ou AVIF · Até 8 MB por arquivo</p></div>
      {r.loading ? <Loading /> : !r.data?.docs.length ? <Empty icon="images" title={r.search ? 'Nenhuma imagem encontrada' : 'Sua biblioteca começa aqui'} text="Envie arquivos do seu computador para usar no site. Descreva cada imagem para facilitar a busca." /> : <div className="hs-library-grid">{r.data.docs.map((m: any) => <button className="hs-library-card" key={m.id} onClick={() => setEditing(m)}><div><img loading="lazy" src={m.sizes?.thumb?.url || m.url} alt={m.alt} /></div><strong>{m.alt}</strong><small>{m.filename}</small><footer><span>{m.width} × {m.height}</span><span>{Math.ceil((m.filesize || 0) / 1024)} KB</span></footer></button>)}</div>}
      <Pager records={r} />
    </section>
    {editing && <MediaForm initial={editing} close={() => setEditing(null)} saved={(message: string) => { setEditing(null); r.refresh(); setSuccess(message) }} />}
  </div>
}
function MediaForm({ initial, close, saved }: { initial: any; close: () => void; saved: (message: string) => void }) {
  const [alt, setAlt] = React.useState(initial.alt || ''), [file, setFile] = React.useState<File | null>(null), [error, setError] = React.useState(''), [busy, setBusy] = React.useState(false)
  const dirty = alt !== (initial.alt || '') || !!file
  useUnsaved(dirty)
  const dismiss = () => { if (!dirty || window.confirm('Descartar as alterações desta imagem?')) close() }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (!initial.id && !file) throw new Error('Selecione uma imagem do seu computador.')
      if (file && (file.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type))) throw new Error('Envie um arquivo JPG, PNG, WebP ou AVIF de até 8 MB.')
      const body = new FormData(); body.append('_payload', JSON.stringify({ alt: alt.trim() })); if (file) body.append('file', file)
      await request('/api/media' + (initial.id ? '/' + initial.id : ''), { method: initial.id ? 'PATCH' : 'POST', body })
      await request('/api/site-sync', { method: 'POST' }); saved('Imagem salva e disponível para uso no site.')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('Excluir esta imagem permanentemente? Arquivos em uso são protegidos.')) return
    setBusy(true); setError('')
    try { await request('/api/media/' + initial.id, { method: 'DELETE' }); saved('Imagem excluída.') } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <Modal title={initial.id ? 'Detalhes da imagem' : 'Enviar imagem'} close={dismiss}><form className="hs-management-form" onSubmit={save}><Notice text={error} />{initial.url && <img className="hs-image-preview" src={initial.sizes?.card?.url || initial.url} alt={initial.alt} />}<label>{initial.id ? 'Substituir arquivo (opcional)' : 'Arquivo da imagem'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" required={!initial.id} onChange={e => setFile(e.target.files?.[0] || null)} /><small>Selecione o arquivo original · Até 8 MB. A substituição mantém a imagem nos locais em que é utilizada.</small></label><label>Descrição da imagem<input required maxLength={250} value={alt} onChange={e => setAlt(e.target.value)} placeholder="Ex.: Caminhão HS no centro de distribuição" /><small>Explique o que aparece na foto. Essa descrição também é lida por leitores de tela.</small></label>{initial.id && <p className="hs-workspace-note">{initial.filename} · Enviada em {formatDate(initial.createdAt)}</p>}<div className="hs-form-actions">{initial.id && <button type="button" className="hs-text-button hs-danger" disabled={busy} onClick={remove}>Excluir imagem</button>}<button type="button" className="hs-button hs-button-light" disabled={busy} onClick={dismiss}>Cancelar</button><button className="hs-button hs-button-green" disabled={busy}>{busy ? 'Salvando…' : 'Salvar imagem'}</button></div></form></Modal>
}

export function CategoryManager() {
  return <SimpleManager kind="categories" />
}
export function RedirectManager() {
  return <SimpleManager kind="redirects" />
}
function SimpleManager({ kind }: { kind: 'categories' | 'redirects' }) {
  const category = kind === 'categories', r = useRecords(kind, category ? 'title' : 'from')
  const [editing, setEditing] = React.useState<any>(null), [success, setSuccess] = React.useState('')
  return <div className="hs-workspace"><Heading label={category ? 'ORGANIZAÇÃO EDITORIAL' : 'ENDEREÇOS DO SITE'} title={category ? 'Categorias' : 'Redirecionamentos'} description={category ? 'Agrupe os artigos por assunto para facilitar a navegação no blog.' : 'Leve quem acessa um link antigo para o endereço correto.'}><button className="hs-button hs-button-green" onClick={() => setEditing({})}><BI name="plus-lg" />{category ? 'Nova categoria' : 'Novo redirecionamento'}</button>{category && <Link className="hs-button hs-button-light" href="/admin/collections/posts">Ver artigos</Link>}</Heading><Notice text={r.error} /><Notice text={success} kind="success" /><section className="hs-panel"><div className="hs-management-toolbar"><label>{category ? 'Buscar categoria' : 'Buscar link de origem'}<input value={r.search} onChange={e => r.setSearch(e.target.value)} placeholder={category ? 'Nome da categoria' : '/endereco-antigo'} /></label><p>{category ? 'As categorias ficam disponíveis no editor dos artigos.' : 'Os visitantes são encaminhados automaticamente com código 301.'}</p></div>{r.loading ? <Loading /> : !r.data?.docs.length ? <Empty icon={category ? 'tag' : 'link-45deg'} title={r.search ? 'Nenhum resultado encontrado' : category ? 'Organize seus assuntos' : 'Nenhum redirecionamento cadastrado'} text={category ? 'Crie categorias e selecione-as ao editar um artigo.' : 'Cadastre um redirecionamento quando um endereço do site mudar.'} /> : <div className="hs-management-list">{r.data.docs.map((d: any) => <article key={d.id}><span className="hs-management-icon"><BI name={category ? 'tag' : 'link-45deg'} /></span><div><h2>{category ? d.title : d.from}</h2><p>{category ? d.slug : <><BI name="arrow-right" /> {d.to?.type === 'reference' ? '/blog/' + (d.to.reference?.value?.slug || '') : d.to?.url}</>}</p><small>Atualizado em {formatDate(d.updatedAt)}</small></div><button className="hs-button hs-button-light" onClick={() => setEditing(d)}>Editar</button></article>)}</div>}<Pager records={r} /></section>{editing && <RecordForm kind={kind} initial={editing} close={() => setEditing(null)} saved={() => { setEditing(null); r.refresh(); setSuccess(category ? 'Categoria salva.' : 'Redirecionamento salvo e atualizado no site.') }} deleted={() => { setEditing(null); r.refresh(); setSuccess('Registro excluído.') }} />}</div>
}
function RecordForm({ kind, initial, close, saved, deleted }: { kind: 'categories' | 'redirects'; initial: any; close: () => void; saved: () => void; deleted: () => void }) {
  const category = kind === 'categories'
  const [name, setName] = React.useState(initial.title || initial.from || ''), [slug, setSlug] = React.useState(initial.slug || ''), [url, setUrl] = React.useState(initial.to?.url || ''), [type, setType] = React.useState(initial.to?.type || 'custom'), [post, setPost] = React.useState(String(initial.to?.reference?.value?.id || initial.to?.reference?.value || '')), [posts, setPosts] = React.useState<any[]>([]), [error, setError] = React.useState(''), [busy, setBusy] = React.useState(false)
  const original = [initial.title || initial.from || '', initial.slug || '', initial.to?.url || '', initial.to?.type || 'custom', String(initial.to?.reference?.value?.id || initial.to?.reference?.value || '')]
  const dirty = JSON.stringify([name, slug, url, type, post]) !== JSON.stringify(original)
  useUnsaved(dirty)
  const dismiss = () => { if (!dirty || window.confirm('Descartar as alterações?')) close() }
  React.useEffect(() => {
    if (!category) {
      let live = true
      ;(async () => { const docs: any[] = []; let page = 1, next = true; while (next) { const d = await request(`/api/posts?limit=100&page=${page++}&depth=0&where[_status][equals]=published`); docs.push(...d.docs); next = d.hasNextPage } if (live) setPosts(docs) })().catch(e => setError(e.message))
      return () => { live = false }
    }
  }, [category])
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (!category && (!/^\/(?!\/)[^\s?#]*$/.test(name) || name.startsWith('/admin') || name.startsWith('/api'))) throw new Error('Use um caminho de origem do site, como /pagina-antiga, sem domínio, espaços ou parâmetros.')
      if (!category && type === 'custom' && (!/^(\/(?!\/)|https?:\/\/)/i.test(url) || /\s/.test(url) || name === url)) throw new Error('Informe um destino válido e diferente da origem: /pagina ou https://exemplo.com.')
      if (!category && type === 'reference' && !post) throw new Error('Selecione o artigo de destino.')
      const data = category ? { title: name.trim(), slug } : { from: name.trim(), to: type === 'reference' ? { type, reference: { relationTo: 'posts', value: Number(post) }, url: null } : { type, url: url.trim(), reference: null } }
      await request('/api/' + kind + (initial.id ? '/' + initial.id : ''), { method: initial.id ? 'PATCH' : 'POST', body: JSON.stringify(data) }); await request('/api/site-sync', { method: 'POST' }); saved()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm(category ? 'Excluir esta categoria? Artigos que a utilizam precisam ser reorganizados primeiro.' : 'Excluir este redirecionamento? O link antigo deixará de encaminhar os visitantes.')) return
    setBusy(true); setError('')
    try { await request('/api/' + kind + '/' + initial.id, { method: 'DELETE' }); await request('/api/site-sync', { method: 'POST' }); deleted() } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <Modal title={(initial.id ? 'Editar ' : category ? 'Nova ' : 'Novo ') + (category ? 'categoria' : 'redirecionamento')} close={dismiss}><form className="hs-management-form" onSubmit={save}><Notice text={error} /><label>{category ? 'Nome da categoria' : 'Endereço antigo'}<input required maxLength={180} value={name} onChange={e => setName(e.target.value)} placeholder={category ? 'Ex.: Transporte e distribuição' : '/pagina-antiga'} /></label>{category ? <label>Identificador<input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Gerado automaticamente a partir do nome" /><small>Use letras minúsculas, números e hífens. Deve ser único.</small></label> : <><label>Tipo de destino<select value={type} onChange={e => setType(e.target.value)}><option value="custom">Endereço do site ou link externo</option><option value="reference">Artigo publicado</option></select></label>{type === 'reference' ? <label>Artigo de destino<select required value={post} onChange={e => setPost(e.target.value)}><option value="">Selecione um artigo</option>{posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label> : <label>Novo endereço<input required value={url} onChange={e => setUrl(e.target.value)} placeholder="/blog ou https://exemplo.com" /><small>O visitante será encaminhado para este endereço.</small></label>}</>}<div className="hs-form-actions">{initial.id && <button className="hs-text-button hs-danger" type="button" disabled={busy} onClick={remove}>Excluir</button>}<button className="hs-button hs-button-light" type="button" disabled={busy} onClick={dismiss}>Cancelar</button><button className="hs-button hs-button-green" disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div></form></Modal>
}

export function ActivityLog() {
  const [area, setArea] = React.useState(''), [action, setAction] = React.useState(''), [from, setFrom] = React.useState('')
  const filters = new URLSearchParams()
  if (area) filters.set('where[area][equals]', area)
  if (action) filters.set('where[action][equals]', action)
  if (from) filters.set('where[createdAt][greater_than_equal]', from + 'T00:00:00-03:00')
  const r = useRecords('activity', 'summary', '&' + filters)
  return <div className="hs-workspace"><Heading label="ACOMPANHAMENTO DA EQUIPE" title="Histórico de atividades" description="Consulte quem alterou o conteúdo e quando cada ação aconteceu."><button className="hs-button hs-button-light" onClick={r.refresh}><BI name="arrow-clockwise" />Atualizar</button></Heading><Notice text={r.error} /><section className="hs-panel"><div className="hs-filters hs-audit-filters"><label>Buscar atividade<input value={r.search} onChange={e => r.setSearch(e.target.value)} placeholder="Descrição da ação" /></label><label>Área<select value={area} onChange={e => { setArea(e.target.value); r.setPage(1) }}><option value="">Todas as áreas</option>{Object.entries(AREAS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Ação<select value={action} onChange={e => { setAction(e.target.value); r.setPage(1) }}><option value="">Todas as ações</option><option value="create">Criação</option><option value="update">Alteração</option><option value="delete">Exclusão</option><option value="revoke">Encerramento de sessões</option></select></label><label>A partir de<input type="date" value={from} onChange={e => { setFrom(e.target.value); r.setPage(1) }} /></label></div>{r.loading ? <Loading /> : !r.data?.docs.length ? <Empty icon="clock" title="Nenhuma atividade encontrada" text="As alterações feitas pela equipe serão registradas aqui." /> : <div className="hs-activity-list">{r.data.docs.map((d: any) => <article key={d.id}><span className="hs-management-icon"><BI name={d.action === 'create' ? 'plus-lg' : d.action === 'delete' ? 'box-arrow-right' : 'pencil-square'} /></span><div><span className="hs-status">{AREAS[d.area] || d.area}</span><h2>{d.summary}</h2><p>{d.actor?.name || 'Usuário removido'} <span>· Registro {d.target || '—'}</span></p></div><time dateTime={d.createdAt}>{formatDate(d.createdAt, true)}</time></article>)}</div>}<Pager records={r} /></section><p className="hs-workspace-note"><BI name="shield-check" />O histórico é somente para consulta. Senhas e mensagens privadas dos pedidos não são exibidas.</p></div>
}
