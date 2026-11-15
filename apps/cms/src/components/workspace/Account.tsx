'use client'
import React from 'react'
import Link from 'next/link'
import { useAuth } from '@payloadcms/ui'
import { BI } from '../AdminUI'
import { ROLE_LABELS } from '../../lib/permissions'
import { Loading, Notice, request, useUnsaved } from './shared'

export function Account() {
  const { user, setUser } = useAuth()
  const [name, setName] = React.useState(String(user?.name || '')), [email, setEmail] = React.useState(String(user?.email || ''))
  const [password, setPassword] = React.useState(''), [confirm, setConfirm] = React.useState(''), [busy, setBusy] = React.useState(false), [error, setError] = React.useState(''), [success, setSuccess] = React.useState(''), [changedPassword, setChangedPassword] = React.useState(false)
  const dirty = !changedPassword && (name !== String(user?.name || '') || email !== String(user?.email || '') || !!password || !!confirm)
  useUnsaved(dirty)
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      const result = await request('/api/users/' + user?.id, { method: 'PATCH', body: JSON.stringify({ name: name.trim(), email: email.trim() }) })
      const session = await request('/api/users/me')
      setUser(session); setName(result.doc.name); setEmail(result.doc.email); setSuccess('Seus dados foram atualizados.')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      if (password.length < 12) throw new Error('Use uma senha com pelo menos 12 caracteres.')
      if (password !== confirm) throw new Error('A confirmação precisa ser igual à nova senha.')
      await request('/api/users/' + user?.id, { method: 'PATCH', body: JSON.stringify({ password }) })
      setChangedPassword(true); setPassword(''); setConfirm('')
      // Password changes revoke all active sessions in the Users hook.
      window.setTimeout(() => window.location.assign('/admin/logout'), 50)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  if (!user) return <Loading />
  return <div className="hs-workspace hs-account-workspace"><header className="hs-page-heading"><div><span className="hs-eyebrow">PERFIL E ACESSO</span><h1>Minha conta</h1><p>Atualize seus dados pessoais e cuide do acesso ao painel.</p></div><Link href="/admin" className="hs-button hs-button-light"><BI name="arrow-right" />Voltar à visão geral</Link></header><Notice text={error} /><Notice text={success} kind="success" /><div className="hs-account-layout"><aside className="hs-panel hs-account-summary"><span className="hs-account-avatar">{name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('').toUpperCase() || 'HS'}</span><h2>{user.name}</h2><p>{user.email}</p><span className="hs-status hs-status-fechado">{ROLE_LABELS[String(user.role)] || 'Equipe HS'}</span><div className="hs-account-access"><BI name="shield-check" /><p>Seu perfil define as áreas que você pode acessar. As permissões são gerenciadas pelos administradores em <strong>Equipe e permissões</strong>.</p></div><Link className="hs-text-link" href="/admin/logout">Sair da conta<BI name="arrow-right" /></Link></aside><div className="hs-account-forms"><section className="hs-panel"><div className="hs-panel-heading"><div><h2>Dados pessoais</h2><p>Seu nome aparece nas atividades e nos artigos da equipe.</p></div><BI name="people" /></div><form className="hs-management-form hs-padded-form" onSubmit={save}><label>Nome completo<input autoComplete="name" required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label>E-mail de acesso<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /><small>Use este e-mail para entrar no painel.</small></label><div className="hs-form-actions"><button className="hs-button hs-button-green" disabled={busy || (name === user.name && email === user.email)}>{busy ? 'Salvando…' : 'Salvar meus dados'}</button></div></form></section><section className="hs-panel"><div className="hs-panel-heading"><div><h2>Alterar senha</h2><p>Escolha uma senha exclusiva, com pelo menos 12 caracteres.</p></div><BI name="shield-check" /></div><form className="hs-management-form hs-padded-form" onSubmit={changePassword}><div className="hs-password-grid"><label>Nova senha<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} /></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label></div><p className="hs-workspace-note">Ao salvar a senha, as sessões abertas serão encerradas. Entre novamente com a nova senha.</p><div className="hs-form-actions"><button className="hs-button hs-button-green" disabled={busy || !password}>{busy ? 'Salvando…' : 'Atualizar senha'}</button></div></form></section></div></div></div>
}
