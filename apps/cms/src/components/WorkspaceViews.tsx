import React from 'react'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { activeUser, hasPermission, isAdmin } from '../lib/permissions'
import { Inbox } from './workspace/Inbox'
import { Team } from './workspace/Team'
import { SiteEditor } from './workspace/SiteEditor'

function Frame({ props, children }: { props: AdminViewServerProps; children: React.ReactNode }) {
  const { initPageResult, params, searchParams, user } = props
  return <DefaultTemplate req={initPageResult.req} viewActions={initPageResult.req.payload.config.admin.components?.actions} i18n={initPageResult.req.i18n} locale={initPageResult.locale} params={params} payload={initPageResult.req.payload} permissions={initPageResult.permissions} searchParams={searchParams} user={user} visibleEntities={initPageResult.visibleEntities}>{children}</DefaultTemplate>
}

export function QuotesView(props: AdminViewServerProps) {
  const { initPageResult } = props
  const user = initPageResult.req.user
  if (!activeUser(user)) redirect('/admin/login')
  if (!hasPermission(user, 'quotes'))
    return (
      <div className="hs-workspace">
        <h1>Acesso restrito</h1>
        <p>Seu perfil não tem acesso aos pedidos de cotação.</p>
      </div>
    )
  return <Frame props={props}><Inbox /></Frame>
}
export function TeamView(props: AdminViewServerProps) {
  const { initPageResult } = props
  const user = initPageResult.req.user
  if (!activeUser(user)) redirect('/admin/login')
  if (!isAdmin(user))
    return (
      <div className="hs-workspace">
        <h1>Acesso restrito</h1>
        <p>A gestão da equipe é exclusiva dos administradores.</p>
      </div>
    )
  return <Frame props={props}><Team /></Frame>
}
export function SiteView(props: AdminViewServerProps) {
  const { initPageResult } = props
  const user = initPageResult.req.user
  if (!activeUser(user)) redirect('/admin/login')
  if (!hasPermission(user, 'site') && !hasPermission(user, 'brand'))
    return (
      <div className="hs-workspace">
        <h1>Acesso restrito</h1>
        <p>Seu perfil não permite editar o site.</p>
      </div>
    )
  return <Frame props={props}><SiteEditor /></Frame>
}
