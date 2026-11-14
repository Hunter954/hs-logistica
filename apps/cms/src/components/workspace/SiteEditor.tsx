'use client'
import React from 'react'
import { BI } from '../AdminUI'
import { Field, siteTasks } from './siteFields'
import {
  Loading,
  Modal,
  Notice,
  request,
  useUnsaved,
  useWorkspace,
} from './shared'

const get = (data: any, path: string) =>
  path.split('.').reduce((v, k) => v?.[k], data)
const set = (data: any, path: string, value: any) => {
  const next = structuredClone(data)
  const keys = path.split('.')
  let obj = next
  keys.slice(0, -1).forEach((k) => {
    obj[k] ??= {}
    obj = obj[k]
  })
  obj[keys[keys.length - 1]] = value
  return next
}
const normalize = (v: any): any =>
  Array.isArray(v)
    ? v.map(normalize)
    : v && typeof v === 'object'
      ? 'filename' in v && 'id' in v
        ? v.id
        : Object.fromEntries(
            Object.entries(v).map(([k, value]) => [k, normalize(value)]),
          )
      : v

export function SiteEditor() {
  const { data: workspace, error: accessError } = useWorkspace()
  const [docs, setDocs] = React.useState<any>(null),
    [original, setOriginal] = React.useState<any>(null)
  const [tab, setTab] = React.useState('header'),
    [error, setError] = React.useState(''),
    [success, setSuccess] = React.useState(''),
    [busy, setBusy] = React.useState(false)
  const [picker, setPicker] = React.useState<{
    field: Field
    value: any
    change: (v: any) => void
  } | null>(null)
  const tasks = siteTasks.filter((t) =>
    workspace?.permissions.includes(t.permission),
  )
  const task = tasks.find((t) => t.id === tab) || tasks[0]
  React.useEffect(() => {
    Promise.all([
      request('/api/globals/home?depth=1'),
      request('/api/globals/site-settings?depth=1'),
    ])
      .then(([home, settings]) => {
        const data = { home, 'site-settings': settings }
        setDocs(data)
        setOriginal(structuredClone(data))
      })
      .catch((e) => setError(e.message))
    const section = new URLSearchParams(window.location.search).get('section')
    if (section) setTab(section)
  }, [])
  const dirtyFor = (target: string) =>
    !!docs && JSON.stringify(docs[target]) !== JSON.stringify(original[target])
  const dirty = dirtyFor('home') || dirtyFor('site-settings')
  useUnsaved(dirty)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!task) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const roots = [
        ...new Set(
          siteTasks
            .filter((t) => t.target === task.target)
            .flatMap((t) => t.fields.map((f) => f.key.split('.')[0])),
        ),
      ]
      const data = Object.fromEntries(
        roots
          .filter((k) => docs[task.target][k] !== undefined)
          .map((k) => [k, normalize(docs[task.target][k])]),
      )
      await request('/api/globals/' + task.target, {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          expectedUpdatedAt: original[task.target].updatedAt,
        }),
      })
      const fresh = await request('/api/globals/' + task.target + '?depth=1')
      setDocs((d: any) => ({ ...d, [task.target]: fresh }))
      setOriginal((d: any) => ({ ...d, [task.target]: structuredClone(fresh) }))
      await request('/api/site-sync', { method: 'POST' })
      setSuccess('Conteúdo salvo e publicação atualizada no site.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  function discard() {
    if (
      task &&
      window.confirm('Descartar as mudanças não salvas desta área?')
    ) {
      setDocs({
        ...docs,
        [task.target]: structuredClone(original[task.target]),
      })
      setError('')
      setSuccess('')
    }
  }
  return (
    <div className="hs-workspace">
      <header className="hs-page-heading">
        <div>
          <span className="hs-eyebrow">CONTEÚDO E IDENTIDADE</span>
          <h1>Editar meu site</h1>
          <p>Organizado por tarefa, com cada mudança conectada à web.</p>
        </div>
        {workspace && (
          <a
            className="hs-button hs-button-light"
            href={workspace.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BI name="arrow-up-right" />
            Ver versão publicada
          </a>
        )}
      </header>
      <Notice text={error || accessError} />
      <Notice text={success} kind="success" />
      {!docs || !workspace ? (
        <Loading />
      ) : !task ? (
        <Notice text="Seu perfil não permite editar o site." />
      ) : (
        <div className="hs-site-editor">
          <nav className="hs-editor-menu" aria-label="Áreas do site">
            {tasks.map((t) => (
              <button
                key={t.id}
                className={t.id === task.id ? 'is-active' : ''}
                onClick={() => {
                  setTab(t.id)
                  setSuccess('')
                  window.history.replaceState(
                    null,
                    '',
                    '/admin/site?section=' + t.id,
                  )
                }}
              >
                <BI name={t.icon} />
                <span>{t.label}</span>
                {dirtyFor(t.target) && (
                  <span
                    className="hs-unsaved-dot"
                    title="Há alterações não salvas nesta área"
                  />
                )}
              </button>
            ))}
          </nav>
          <form
            className="hs-panel hs-editor-content hs-work-form"
            onSubmit={save}
          >
            <div className="hs-editor-heading">
              <span className="hs-eyebrow">
                {task.target === 'home'
                  ? 'PÁGINA INICIAL'
                  : 'IDENTIDADE E CONFIGURAÇÕES'}
              </span>
              <h2>{task.label}</h2>
              <p>{task.text}</p>
            </div>
            {task.fields.map((field) => (
              <EditorField
                key={task.id + field.key}
                field={field}
                value={get(docs[task.target], field.key)}
                change={(value) =>
                  setDocs((d: any) => ({
                    ...d,
                    [task.target]: set(d[task.target], field.key, value),
                  }))
                }
                image={(field, value, change) =>
                  setPicker({ field, value, change })
                }
              />
            ))}
            <div className="hs-editor-save">
              <div>
                <strong>
                  {dirtyFor(task.target)
                    ? 'Alterações ainda não publicadas'
                    : 'Conteúdo atualizado'}
                </strong>
                <small>
                  {task.target === 'home'
                    ? 'Salva as alterações da página inicial.'
                    : 'Salva as alterações de marca, menu e configurações.'}
                </small>
              </div>
              <div className="hs-actions">
                <button
                  type="button"
                  className="hs-button hs-button-light"
                  disabled={busy || !dirtyFor(task.target)}
                  onClick={discard}
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="hs-button hs-button-green"
                  disabled={busy || !dirtyFor(task.target)}
                >
                  <BI name="check-circle" />
                  {busy ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      {picker && (
        <ImagePicker
          canUpload={workspace?.permissions.includes('media')}
          selected={(media) => {
            picker.change(media)
            setPicker(null)
          }}
          close={() => setPicker(null)}
        />
      )}
    </div>
  )
}

function EditorField({
  field,
  value,
  change,
  image,
}: {
  field: Field
  value: any
  change: (v: any) => void
  image: (f: Field, v: any, c: (v: any) => void) => void
}) {
  const id = React.useId()
  if (field.type === 'checkbox')
    return (
      <label className="hs-checkbox">
        <input
          type="checkbox"
          checked={value !== false}
          onChange={(e) => change(e.target.checked)}
        />
        <span>
          {field.label}
          {field.hint && <small>{field.hint}</small>}
        </span>
      </label>
    )
  if (field.type === 'list') {
    const rows: any[] = value || []
    return (
      <fieldset className="hs-repeatable">
        <legend>{field.label}</legend>
        {field.hint && <p>{field.hint}</p>}
        {rows.map((row, index) => (
          <div className="hs-repeat-row" key={row.id || index}>
            <header>
              <strong>
                {String(
                  row.t ||
                    row.q ||
                    row.text ||
                    row.label ||
                    row.k ||
                    `${field.label} ${index + 1}`,
                ).slice(0, 80)}
              </strong>
              <div>
                <button
                  type="button"
                  aria-label={`Mover item ${index + 1} para cima`}
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...rows]
                    ;[next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ]
                    change(next)
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Mover item ${index + 1} para baixo`}
                  disabled={index === rows.length - 1}
                  onClick={() => {
                    const next = [...rows]
                    ;[next[index], next[index + 1]] = [
                      next[index + 1],
                      next[index],
                    ]
                    change(next)
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="hs-remove"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Remover este item? A mudança só é aplicada ao salvar.',
                      )
                    )
                      change(rows.filter((_, i) => i !== index))
                  }}
                >
                  Remover
                </button>
              </div>
            </header>
            {field.fields?.map((child) => (
              <EditorField
                key={child.key}
                field={child}
                value={row[child.key]}
                change={(v) =>
                  change(
                    rows.map((r, i) =>
                      i === index ? { ...r, [child.key]: v } : r,
                    ),
                  )
                }
                image={image}
              />
            ))}
          </div>
        ))}
        {!rows.length && (
          <div className="hs-small-empty">Nenhum item adicionado.</div>
        )}
        <button
          className="hs-button hs-button-light"
          type="button"
          disabled={!!field.maxRows && rows.length >= field.maxRows}
          onClick={() =>
            change([
              ...rows,
              Object.fromEntries(
                (field.fields || []).map((f) => [
                  f.key,
                  f.type === 'image' ? null : '',
                ]),
              ),
            ])
          }
        >
          <BI name="plus-lg" />
          Adicionar item
          {field.maxRows ? ` (${rows.length}/${field.maxRows})` : ''}
        </button>
      </fieldset>
    )
  }
  if (field.type === 'image')
    return (
      <div className="hs-image-field">
        <label>{field.label}</label>
        <div>
          {value?.url ? (
            <img
              src={value.sizes?.thumb?.url || value.url}
              alt={value.alt || ''}
            />
          ) : (
            <span className="hs-image-placeholder">
              <BI name="images" />
              Nenhuma imagem selecionada
            </span>
          )}
          <section>
            <button
              className="hs-button hs-button-light"
              type="button"
              onClick={() => image(field, value, change)}
            >
              <BI name="images" />
              {value ? 'Trocar imagem' : 'Selecionar imagem'}
            </button>
            {value && (
              <button
                className="hs-text-button"
                type="button"
                onClick={() => change(null)}
              >
                Remover seleção
              </button>
            )}
            <small>{field.hint}</small>
            {value?.alt && <small>Descrição: {value.alt}</small>}
          </section>
        </div>
      </div>
    )
  return (
    <label htmlFor={id}>
      <span>{field.label}{field.required && <span className="hs-required" aria-hidden="true"> *</span>}</span>
      {field.type === 'textarea' ? (
        <textarea
          id={id}
          rows={4}
          value={value || ''}
          required={field.required}
          onChange={(e) => change(e.target.value)}
        />
      ) : field.type === 'select' ? (
        <select
          id={id}
          value={value || ''}
          required={field.required}
          onChange={(e) => change(e.target.value)}
        >
          <option value="">Selecione</option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'color' ? (
        <div className="hs-color-field">
          <input
            aria-label={field.label + ' — seletor'}
            type="color"
            value={value || '#000000'}
            onChange={(e) => change(e.target.value)}
          />
          <input
            id={id}
            pattern="#[0-9a-fA-F]{6}"
            required
            value={value || ''}
            onChange={(e) => change(e.target.value)}
          />
        </div>
      ) : (
        <input
          id={id}
          type={
            field.type === 'number'
              ? 'number'
              : field.type === 'email'
                ? 'email'
                : 'text'
          }
          min={field.min}
          max={field.max}
          value={value ?? ''}
          required={field.required}
          onChange={(e) =>
            change(
              field.type === 'number' ? Number(e.target.value) : e.target.value,
            )
          }
        />
      )}
      {field.hint && <small>{field.hint}</small>}
    </label>
  )
}

function ImagePicker({
  canUpload,
  selected,
  close,
}: {
  canUpload: boolean
  selected: (media: any) => void
  close: () => void
}) {
  const [data, setData] = React.useState<any>(null),
    [search, setSearch] = React.useState(''),
    [page, setPage] = React.useState(1),
    [error, setError] = React.useState(''),
    [alt, setAlt] = React.useState(''),
    [file, setFile] = React.useState<File | null>(null),
    [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    let live = true
    const timer = setTimeout(
      () =>
        request(
          '/api/media?limit=18&sort=-createdAt&page=' +
            page +
            '&where[alt][contains]=' +
            encodeURIComponent(search),
        )
          .then((d) => {
            if (live) setData(d)
          })
          .catch((e) => {
            if (live) setError(e.message)
          }),
      200,
    )
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [search, page])
  async function upload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !alt.trim()) return
    setError('')
    if (file.size > 8 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 8 MB.')
      return
    }
    setBusy(true)
    const body = new FormData()
    body.append('_payload', JSON.stringify({ alt: alt.trim() }))
    body.append('file', file)
    try {
      const r = await request('/api/media', { method: 'POST', body })
      selected(r.doc)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Escolher imagem" close={close} wide>
      <Notice text={error} />
      <div className="hs-image-picker">
        {canUpload && (
          <form className="hs-work-form hs-upload-form" onSubmit={upload}>
            <h3>Enviar nova imagem</h3>
            <label>
              Arquivo (até 8 MB)
              <input
                type="file"
                required
                accept="image/png,image/jpeg,image/webp,image/avif"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <label>
              Descrição da imagem
              <input
                required
                maxLength={200}
                value={alt}
                placeholder="Descreva o que aparece na imagem"
                onChange={(e) => setAlt(e.target.value)}
              />
            </label>
            <button className="hs-button hs-button-green" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar e selecionar'}
            </button>
          </form>
        )}
        <section>
          <label className="hs-library-search">
            Buscar na biblioteca
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Descrição da imagem"
            />
          </label>
          {!data ? (
            <Loading />
          ) : (
            <>
              <div className="hs-media-grid">
                {data.docs.map((m: any) => (
                  <button type="button" key={m.id} onClick={() => selected(m)}>
                    <img src={m.sizes?.thumb?.url || m.url} alt={m.alt} />
                    <span>{m.alt}</span>
                  </button>
                ))}
              </div>
              {!data.docs.length && (
                <p className="hs-small-empty">Nenhuma imagem encontrada.</p>
              )}
              <div className="hs-pagination">
                <button
                  className="hs-button hs-button-light"
                  disabled={page <= 1}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Anterior
                </button>
                <span>
                  {page} / {Math.max(1, data.totalPages)}
                </span>
                <button
                  className="hs-button hs-button-light"
                  disabled={!data.hasNextPage}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Próxima
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </Modal>
  )
}
