'use client'
import React from 'react'
import { BI } from '../AdminUI'
import {
  formatDate,
  Loading,
  Modal,
  Notice,
  request,
  STATUS,
  useWorkspace,
} from './shared'

type Filters = {
  search: string
  status: string
  service: string
  owner: string
  priority: string
  from: string
  to: string
  overdue: string
  sort: string
}
const empty: Filters = {
  search: '',
  status: '',
  service: '',
  owner: '',
  priority: '',
  from: '',
  to: '',
  overdue: '',
  sort: '',
}
const query = (f: Filters) =>
  new URLSearchParams(Object.entries(f).filter(([, v]) => !!v)).toString()
const localDate = (v?: string) =>
  v
    ? new Date(new Date(v).getTime() - new Date(v).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : ''

export function Inbox() {
  const { data: workspace, error: accessError } = useWorkspace()
  const initial = React.useMemo(
    () =>
      typeof window === 'undefined'
        ? empty
        : {
            ...empty,
            ...Object.fromEntries(new URLSearchParams(window.location.search)),
          },
    [],
  )
  const [filters, setFilters] = React.useState<Filters>(initial)
  const [applied, setApplied] = React.useState<Filters>(initial)
  const [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<any>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [revision, refresh] = React.useState(0)
  const [selected, setSelected] = React.useState<number | null>(null)
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (id && /^\d+$/.test(id)) setSelected(Number(id))
  }, [])
  React.useEffect(() => {
    let live = true
    setLoading(true)
    setError('')
    request('/api/inbox?' + query(applied) + '&page=' + page)
      .then((d) => {
        if (live) setData(d)
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
      .finally(() => {
        if (live) setLoading(false)
      })
    return () => {
      live = false
    }
  }, [applied, page, revision])
  function apply(f: Filters) {
    setApplied(f)
    setFilters(f)
    setPage(1)
    window.history.replaceState(
      null,
      '',
      '/admin/inbox' + (query(f) ? '?' + query(f) : ''),
    )
  }
  const agentName = (id: number) =>
    data?.agents.find((a: any) => String(a.id) === String(id))?.name ||
    'Não atribuído'
  return (
    <div className="hs-workspace">
      <header className="hs-page-heading">
        <div>
          <span className="hs-eyebrow">RELACIONAMENTO COM CLIENTES</span>
          <h1>Pedidos de cotação</h1>
          <p>
            Receba, organize e acompanhe as oportunidades enviadas pelo site.
          </p>
        </div>
        <div className="hs-actions">
          <button
            className="hs-button hs-button-light"
            onClick={() => refresh((v) => v + 1)}
          >
            <BI name="arrow-clockwise" />
            Atualizar
          </button>
          {workspace?.permissions.includes('export') && (
            <a
              className="hs-button hs-button-light"
              href={'/api/inbox?format=csv&' + query(applied)}
              download
            >
              <BI name="file-earmark-text" />
              Exportar filtros
            </a>
          )}
        </div>
      </header>
      <Notice text={error || accessError} />
      <div className="hs-inbox-summary">
        {[
          { label: 'Todos os pedidos', key: 'total', value: '' },
          { label: 'Novos', key: 'novo', value: 'novo' },
          { label: 'Em contato', key: 'contato', value: 'em contato' },
          { label: 'Fechados', key: 'fechado', value: 'fechado' },
        ].map((t) => (
          <button
            key={t.key}
            className={
              applied.status === t.value && !applied.overdue ? 'is-active' : ''
            }
            onClick={() => apply({ ...applied, status: t.value, overdue: '' })}
          >
            <span>{t.label}</span>
            <strong>{data?.summary[t.key] ?? '—'}</strong>
          </button>
        ))}
        <button
          className={applied.overdue ? 'is-active hs-overdue' : 'hs-overdue'}
          onClick={() => apply({ ...applied, status: '', overdue: '1' })}
        >
          <span>Retornos atrasados</span>
          <strong>{data?.summary.overdue ?? '—'}</strong>
        </button>
      </div>
      <section className="hs-panel">
        <form
          className="hs-filters"
          onSubmit={(e) => {
            e.preventDefault()
            apply(filters)
          }}
        >
          <div className="hs-filter-search">
            <label htmlFor="inbox-search">Buscar pedido</label>
            <input
              id="inbox-search"
              placeholder="Cliente, contato, serviço ou mensagem"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
          <label>
            Situação
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">Todas</option>
              {Object.entries(STATUS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Serviço
            <input
              list="hs-services"
              placeholder="Todos os serviços"
              value={filters.service}
              onChange={(e) =>
                setFilters({ ...filters, service: e.target.value })
              }
            />
            <datalist id="hs-services">
              {data?.services.map((s: string) => <option key={s} value={s} />)}
            </datalist>
          </label>
          <label>
            Responsável
            <select
              value={filters.owner}
              onChange={(e) =>
                setFilters({ ...filters, owner: e.target.value })
              }
            >
              <option value="">Toda a equipe</option>
              <option value="mine">Meus atendimentos</option>
              <option value="none">Sem responsável</option>
              {data?.agents.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridade
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value })
              }
            >
              <option value="">Todas</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <label>
            Recebido de
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              min={filters.from || undefined}
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
          <label>
            Ordenar
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            >
              <option value="">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
            </select>
          </label>
          <div className="hs-filter-buttons">
            <button className="hs-button hs-button-green" type="submit">
              Aplicar filtros
            </button>
            <button
              className="hs-button hs-button-light"
              type="button"
              onClick={() => apply(empty)}
            >
              Limpar
            </button>
          </div>
        </form>
        <div className="hs-inbox-caption">
          <span>
            {data
              ? `${data.totalDocs} pedido(s) encontrados`
              : 'Consultando pedidos…'}
            {applied.overdue && ' · somente retornos atrasados'}
          </span>
          <span>
            <BI name="shield-check" />
            Origem: formulário do site
          </span>
        </div>
        {loading ? (
          <Loading />
        ) : !data?.docs.length ? (
          <div className="hs-empty">
            <span className="hs-empty-icon">
              <BI name="chat-left-text" />
            </span>
            <h3>
              {query(applied)
                ? 'Nenhum pedido com esses filtros'
                : 'Sua caixa de entrada está pronta'}
            </h3>
            <p>
              {query(applied)
                ? 'Ajuste os filtros para encontrar outros atendimentos.'
                : 'Os pedidos enviados pelo site aparecem aqui automaticamente.'}
            </p>
          </div>
        ) : (
          <div className="hs-table-wrap">
            <table className="hs-table hs-inbox-table">
              <thead>
                <tr>
                  <th>Cliente e contato</th>
                  <th>Serviço</th>
                  <th>Situação</th>
                  <th>Responsável</th>
                  <th>Próximo retorno</th>
                  <th>Recebido</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.docs.map((q: any) => (
                  <tr key={q.id}>
                    <td>
                      <button
                        className="hs-row-link"
                        onClick={() => setSelected(q.id)}
                      >
                        <strong>{q.name}</strong>
                        <small>{q.contact}</small>
                      </button>
                    </td>
                    <td>
                      {q.service || 'Não informado'}
                      {q.priority === 'alta' && (
                        <span className="hs-priority">Prioridade alta</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`hs-status hs-status-${q.status === 'em contato' ? 'contact' : q.status}`}
                      >
                        {STATUS[q.status]}
                      </span>
                    </td>
                    <td>{agentName(q.assignedTo)}</td>
                    <td
                      className={
                        q.followUp &&
                        Date.parse(q.followUp) < Date.now() &&
                        ['novo', 'em contato'].includes(q.status)
                          ? 'hs-late'
                          : ''
                      }
                    >
                      {formatDate(q.followUp, true)}
                    </td>
                    <td>{formatDate(q.createdAt)}</td>
                    <td>
                      <button
                        className="hs-icon-button"
                        aria-label={`Abrir pedido de ${q.name}`}
                        onClick={() => setSelected(q.id)}
                      >
                        <BI name="arrow-up-right" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer className="hs-pagination">
          <span>
            Página {page} de {Math.max(1, data?.totalPages || 1)}
          </span>
          <div>
            <button
              className="hs-button hs-button-light"
              disabled={loading || page <= 1}
              onClick={() => setPage((v) => v - 1)}
            >
              Anterior
            </button>
            <button
              className="hs-button hs-button-light"
              disabled={loading || !data?.hasNextPage}
              onClick={() => setPage((v) => v + 1)}
            >
              Próxima
            </button>
          </div>
        </footer>
      </section>
      <p className="hs-workspace-note">
        Os dados do cliente são preservados. Atualize apenas o atendimento;
        novos pedidos chegam pelo site.
      </p>
      {selected && (
        <QuoteDetail
          id={selected}
          agents={data?.agents || workspace?.agents || []}
          close={() => setSelected(null)}
          saved={() => refresh((v) => v + 1)}
        />
      )}
    </div>
  )
}

function QuoteDetail({
  id,
  agents,
  close,
  saved,
}: {
  id: number
  agents: any[]
  close: () => void
  saved: () => void
}) {
  const [doc, setDoc] = React.useState<any>(null),
    [form, setForm] = React.useState<any>({})
  const [error, setError] = React.useState(''),
    [success, setSuccess] = React.useState(''),
    [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    request('/api/quotes/' + id + '?depth=0')
      .then((d) => {
        setDoc(d)
        setForm({
          status: d.status,
          priority: d.priority || 'normal',
          assignedTo: d.assignedTo || '',
          followUp: localDate(d.followUp),
          notes: d.notes || '',
        })
      })
      .catch((e) => setError(e.message))
  }, [id])
  const dirty =
    doc &&
    JSON.stringify(form) !==
      JSON.stringify({
        status: doc.status,
        priority: doc.priority || 'normal',
        assignedTo: doc.assignedTo || '',
        followUp: localDate(doc.followUp),
        notes: doc.notes || '',
      })
  function dismiss() {
    if (!dirty || window.confirm('Descartar as alterações deste atendimento?'))
      close()
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const r = await request('/api/quotes/' + id, {
        method: 'PATCH',
        body: JSON.stringify({
          ...form,
          expectedUpdatedAt: doc.updatedAt,
          assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
          followUp: form.followUp
            ? new Date(form.followUp).toISOString()
            : null,
        }),
      })
      setDoc(r.doc)
      setForm({
        status: r.doc.status,
        priority: r.doc.priority || 'normal',
        assignedTo: r.doc.assignedTo || '',
        followUp: localDate(r.doc.followUp),
        notes: r.doc.notes || '',
      })
      setSuccess('Atendimento atualizado.')
      saved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const contact = doc?.contact || '',
    email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact),
    phone = contact.replace(/\D/g, ''),
    canCall = !email && phone.length >= 8 && phone.length <= 15
  return (
    <Modal
      title={'Cotação #' + String(id).padStart(4, '0')}
      close={dismiss}
      wide
    >
      <Notice text={error} />
      <Notice text={success} kind="success" />
      {!doc ? (
        <Loading />
      ) : (
        <div className="hs-detail-grid">
          <section className="hs-detail-customer">
            <span className="hs-eyebrow">DADOS ENVIADOS PELO CLIENTE</span>
            <h3>{doc.name}</h3>
            <p>{doc.contact}</p>
            <div className="hs-actions">
              {email && (
                <a
                  className="hs-button hs-button-light"
                  href={
                    'mailto:' +
                    encodeURIComponent(contact) +
                    '?subject=' +
                    encodeURIComponent('Sua cotação na HS Logística')
                  }
                >
                  Responder por e-mail
                </a>
              )}
              {canCall && (
                <>
                  <a
                    className="hs-button hs-button-light"
                    href={
                      'tel:+' + (phone.startsWith('55') ? phone : '55' + phone)
                    }
                  >
                    Ligar
                  </a>
                  <a
                    className="hs-button hs-button-light"
                    href={
                      'https://wa.me/' +
                      (phone.startsWith('55') ? phone : '55' + phone)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir WhatsApp
                  </a>
                </>
              )}
            </div>
            <dl>
              <dt>Serviço solicitado</dt>
              <dd>{doc.service || 'Não informado'}</dd>
              <dt>Mensagem sobre a carga</dt>
              <dd className="hs-prewrap">
                {doc.message || 'O cliente não informou detalhes.'}
              </dd>
              <dt>Recebido em</dt>
              <dd>{formatDate(doc.createdAt, true)}</dd>
              <dt>Origem</dt>
              <dd>Formulário do site</dd>
            </dl>
            <div className="hs-timeline">
              <h4>Histórico do atendimento</h4>
              {Array.isArray(doc.history) && doc.history.length ? (
                [...doc.history].reverse().map((h: any, i: number) => (
                  <div key={i}>
                    <strong>{h.actor}</strong>
                    <small>{formatDate(h.at, true)}</small>
                    <p>{h.text}</p>
                  </div>
                ))
              ) : (
                <p>Pedido anterior à ativação do histórico.</p>
              )}
            </div>
          </section>
          <form className="hs-work-form hs-detail-form" onSubmit={save}>
            <h3>Acompanhar atendimento</h3>
            <label>
              Situação
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {Object.entries(STATUS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Responsável
              <select
                value={form.assignedTo}
                onChange={(e) =>
                  setForm({ ...form, assignedTo: e.target.value })
                }
              >
                <option value="">Sem responsável</option>
                {agents.filter(a => a.canAttend || String(a.id) === String(doc.assignedTo)).map((a) => (
                  <option key={a.id} value={a.id} disabled={!a.canAttend}>
                    {a.name}{!a.active ? ' (conta desativada)' : !a.canAttend ? ' (sem acesso ao atendimento)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridade
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
              </select>
            </label>
            <label>
              Próximo retorno
              <input
                type="datetime-local"
                value={form.followUp}
                onChange={(e) => setForm({ ...form, followUp: e.target.value })}
              />
            </label>
            <label>
              Notas internas
              <textarea
                rows={5}
                maxLength={2000}
                value={form.notes}
                placeholder="Registre combinações, condições ou motivo do descarte."
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <small>Visíveis somente à equipe com acesso às cotações.</small>
            </label>
            <button
              className="hs-button hs-button-green"
              disabled={busy || !dirty}
              type="submit"
            >
              {busy ? 'Salvando…' : 'Salvar atendimento'}
            </button>
            <button
              type="button"
              className="hs-button hs-button-light"
              onClick={dismiss}
            >
              Fechar
            </button>
          </form>
        </div>
      )}
    </Modal>
  )
}
