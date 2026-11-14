'use client'
import React from 'react'
import Link from 'next/link'
import { BI } from '../AdminUI'
import { PERMISSIONS, ROLE_LABELS, hasPermission } from '../../lib/permissions'
import { Loading, Modal, Notice, request, useWorkspace } from './shared'

const blank = {
  name: '',
  email: '',
  role: 'editor',
  active: true,
  permissions: [] as string[],
  password: '',
}
export function Team() {
  const { data: workspace, error: accessError } = useWorkspace()
  const [users, setUsers] = React.useState<any[]>([]),
    [error, setError] = React.useState(''),
    [message, setMessage] = React.useState('')
  const [loading, setLoading] = React.useState(true),
    [search, setSearch] = React.useState(''),
    [role, setRole] = React.useState(''),
    [active, setActive] = React.useState('')
  const [editing, setEditing] = React.useState<any>(null)
  const load = React.useCallback(() => {
    setLoading(true)
    void (async () => {
      const all: any[] = []
      let page = 1,
        hasNext = true
      while (hasNext) {
        const d = await request(
          '/api/users?limit=100&sort=name&depth=0&page=' + page,
        )
        all.push(...d.docs)
        hasNext = d.hasNextPage
        page++
      }
      setUsers(all)
    })()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])
  React.useEffect(load, [load])
  const filtered = users.filter(
    (u) =>
      (!search ||
        `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) &&
      (!role || u.role === role) &&
      (!active || (u.active !== false) === (active === 'yes')),
  )
  async function revoke(user: any) {
    if (
      !window.confirm(
        `Encerrar todas as sessões de ${user.name}? A pessoa precisará entrar novamente.`,
      )
    )
      return
    setError('')
    setMessage('')
    try {
      await request('/api/team/' + user.id + '/revoke', { method: 'POST' })
      setMessage('Sessões encerradas.')
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  async function unlock(user: any) {
    setError('')
    setMessage('')
    try {
      await request('/api/users/unlock', {
        method: 'POST',
        body: JSON.stringify({ email: user.email }),
      })
      setMessage('Conta desbloqueada para novas tentativas de login.')
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <div className="hs-workspace">
      <header className="hs-page-heading">
        <div>
          <span className="hs-eyebrow">ACESSOS E RESPONSABILIDADES</span>
          <h1>Equipe e permissões</h1>
          <p>Cada pessoa com o acesso adequado ao seu trabalho.</p>
        </div>
        <button
          className="hs-button hs-button-green"
          onClick={() => setEditing({ ...blank })}
        >
          <BI name="plus-lg" />
          Adicionar pessoa
        </button>
      </header>
      <Notice text={error || accessError} />
      <Notice text={message} kind="success" />
      <div className="hs-role-cards">
        {Object.entries(ROLE_LABELS).map(([value, label]) => (
          <button
            key={value}
            className={role === value ? 'is-active' : ''}
            onClick={() => setRole(role === value ? '' : value)}
          >
            <BI
              name={
                value === 'admin'
                  ? 'shield-check'
                  : value === 'atendimento'
                    ? 'chat-left-text'
                    : value === 'editor'
                      ? 'pencil-square'
                      : 'gear'
              }
            />
            <strong>{label}</strong>
            <small>
              {value === 'admin'
                ? 'Gestão completa e equipe'
                : value === 'editor'
                  ? 'Site, blog e biblioteca de imagens'
                  : value === 'atendimento'
                    ? 'Recebimento e acompanhamento de cotações'
                    : 'Permissões escolhidas por pessoa'}
            </small>
            <span>
              {users.filter((u) => u.role === value).length} pessoa(s)
            </span>
          </button>
        ))}
      </div>
      <section className="hs-panel">
        <div className="hs-filters hs-team-filters">
          <label>
            Buscar pessoa
            <input
              placeholder="Nome ou e-mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            Perfil
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Todos os perfis</option>
              {Object.entries(ROLE_LABELS).map(([v, label]) => (
                <option value={v} key={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Situação
            <select value={active} onChange={(e) => setActive(e.target.value)}>
              <option value="">Todas as contas</option>
              <option value="yes">Ativas</option>
              <option value="no">Desativadas</option>
            </select>
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : (
          <div className="hs-table-wrap">
            <table className="hs-table hs-inbox-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>
                        {u.name}
                        {u.id === workspace?.user.id ? ' (você)' : ''}
                      </strong>
                      <small>{u.email}</small>
                    </td>
                    <td>{ROLE_LABELS[u.role] || u.role}</td>
                    <td>
                      <span
                        className={
                          'hs-status ' +
                          (u.active !== false ? 'hs-status-fechado' : '')
                        }
                      >
                        {u.active !== false ? 'Ativa' : 'Desativada'}
                      </span>
                      {u.lockUntil && Date.parse(u.lockUntil) > Date.now() && (
                        <small className="hs-late">
                          Bloqueada por tentativas de login
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="hs-actions">
                        <button
                          className="hs-button hs-button-light"
                          onClick={() =>
                            setEditing({
                              ...u,
                              permissions: u.permissions || [],
                              active: u.active !== false,
                              password: '',
                            })
                          }
                        >
                          Gerenciar
                        </button>
                        {u.id !== workspace?.user.id && (
                          <button
                            className="hs-text-button"
                            onClick={() => revoke(u)}
                          >
                            Encerrar sessões
                          </button>
                        )}
                        {u.id !== workspace?.user.id && (
                          <button
                            className="hs-text-button"
                            onClick={() => unlock(u)}
                          >
                            Desbloquear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="hs-empty">
                <h3>Nenhuma pessoa encontrada</h3>
                <p>Experimente outro nome ou ajuste os filtros.</p>
              </div>
            )}
          </div>
        )}
      </section>
      <section className="hs-panel hs-permission-matrix">
        <div className="hs-panel-heading">
          <div>
            <h2>O que cada perfil pode fazer</h2>
            <p>Permissões também são verificadas no servidor.</p>
          </div>
        </div>
        <div className="hs-table-wrap">
          <table className="hs-table">
            <thead>
              <tr>
                <th>Função</th>
                {['admin', 'editor', 'atendimento'].map((r) => (
                  <th key={r}>{ROLE_LABELS[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ...PERMISSIONS,
                {
                  value: 'team',
                  label: 'Gerenciar pessoas e consultar atividades',
                },
              ].map((p) => (
                <tr key={p.value}>
                  <td>{p.label}</td>
                  {['admin', 'editor', 'atendimento'].map((role) => (
                    <td key={role}>
                      {role === 'admin' ||
                      (p.value !== 'team' &&
                        hasPermission(
                          { role, active: true },
                          p.value as any,
                        )) ? (
                        <span className="hs-permission-yes">Permitido</span>
                      ) : (
                        <span className="hs-muted">Sem acesso</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="hs-workspace-note">
        <BI name="shield-check" />
        Desativar preserva o histórico e encerra sessões.{' '}
        <Link href="/admin/collections/activity">
          Consultar histórico de atividades
        </Link>
      </p>
      {editing && (
        <PersonEditor
          user={editing}
          self={editing.id === workspace?.user.id}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null)
            setMessage(
              'Conta atualizada. Alterações de acesso encerram as sessões anteriores.',
            )
            load()
          }}
        />
      )}
    </div>
  )
}
function PersonEditor({
  user,
  self,
  close,
  saved,
}: {
  user: any
  self: boolean
  close: () => void
  saved: () => void
}) {
  const [form, setForm] = React.useState({ ...user }),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState('')
  const dirty = JSON.stringify(form) !== JSON.stringify(user)
  const dismiss = () => {
    if (!dirty || window.confirm('Descartar as alterações desta conta?'))
      close()
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const data: any = {
      name: form.name,
      email: form.email,
      role: form.role,
      permissions: form.role === 'personalizado' ? form.permissions : [],
      active: form.active,
    }
    if (form.password) data.password = form.password
    try {
      await request('/api/users' + (user.id ? '/' + user.id : ''), {
        method: user.id ? 'PATCH' : 'POST',
        body: JSON.stringify(data),
      })
      saved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function remove() {
    if (window.prompt('Para excluir esta conta sem registros vinculados, digite o e-mail completo. Para contas com histórico, use a desativação.') !== user.email) return
    setBusy(true)
    setError('')
    try {
      await request('/api/users/' + user.id, { method: 'DELETE' })
      saved()
    } catch (e) {
      setError((e as Error).message)
    } finally { setBusy(false) }
  }
  return (
    <Modal
      title={user.id ? 'Gerenciar pessoa' : 'Adicionar pessoa à equipe'}
      close={dismiss}
    >
      <form className="hs-work-form" onSubmit={save}>
        <Notice text={error} />
        <label>
          Nome
          <input
            required
            autoComplete="name"
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          E-mail de acesso
          <input
            required
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Perfil de acesso
          <select
            disabled={self && user.role === 'admin'}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {Object.entries(ROLE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <small>
            {self
              ? 'Você não pode remover a própria administração.'
              : 'As permissões são aplicadas imediatamente ao salvar.'}
          </small>
        </label>
        {form.role === 'personalizado' && (
          <fieldset className="hs-checklist">
            <legend>Áreas e ações permitidas</legend>
            {PERMISSIONS.map((p) => (
              <label key={p.value}>
                <input
                  type="checkbox"
                  checked={form.permissions.includes(p.value)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      permissions: e.target.checked
                        ? [...form.permissions, p.value]
                        : form.permissions.filter((v: string) => v !== p.value),
                    })
                  }
                />
                {p.label}
              </label>
            ))}
            <small>
              Publicar exige também acesso ao blog. Exportar exige também acesso
              às cotações.
            </small>
          </fieldset>
        )}
        <label>
          {user.id ? 'Nova senha (opcional)' : 'Senha inicial'}
          <input
            type="password"
            autoComplete="new-password"
            required={!user.id}
            minLength={12}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <small>
            Pelo menos 12 caracteres.{' '}
            {user.id
              ? 'Deixe vazio para manter a senha atual.'
              : 'Compartilhe a senha inicial diretamente com a pessoa.'}
          </small>
        </label>
        <label className="hs-checkbox">
          <input
            type="checkbox"
            disabled={self}
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          <span>
            Conta ativa<small>Contas desativadas não acessam o painel.</small>
          </span>
        </label>
        {user.id && !self && <div className="hs-account-delete"><p>Para preservar atendimentos e autoria, prefira desativar. Só é possível excluir contas sem registros vinculados.</p><button type="button" className="hs-text-button" disabled={busy} onClick={remove}>Excluir conta sem registros</button></div>}
        <div className="hs-form-actions">
          <button
            type="button"
            className="hs-button hs-button-light"
            onClick={dismiss}
          >
            Cancelar
          </button>
          <button
            className="hs-button hs-button-green"
            disabled={busy}
            type="submit"
          >
            {busy ? 'Salvando…' : user.id ? 'Salvar conta' : 'Criar acesso'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
