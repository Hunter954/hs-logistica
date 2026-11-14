'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, useNav, usePreferences } from '@payloadcms/ui'
import { hasPermission, isAdmin, ROLE_LABELS } from '../lib/permissions'

export function BI({
  name,
  className = '',
}: {
  name: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`hs-icon ${className}`}
      style={{
        maskImage: `url(/icons/${name}.svg)`,
        WebkitMaskImage: `url(/icons/${name}.svg)`,
      }}
    />
  )
}

export function NavBrand() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { hydrated, setNavOpen } = useNav()
  const { getPreference } = usePreferences()
  React.useEffect(() => {
    if (!hydrated || !window.matchMedia('(min-width: 1100px)').matches) return
    let cancelled = false
    let frame = 0
    // Wait for Payload to restore its saved state before opening this workspace.
    void getPreference('nav').then(() => {
      if (!cancelled) frame = requestAnimationFrame(() => setNavOpen(true))
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [hydrated, getPreference, setNavOpen])
  return (
    <div className="hs-nav-intro">
      <Link href="/admin" className="hs-brand">
        <span className="hs-brand-logo">
          <img src="/logo.png" alt="HS" />
        </span>
        <span>
          <strong>HS Logística</strong>
          <small>PAINEL DE GESTÃO</small>
        </span>
      </Link>
      <span className="hs-nav-caption">ÁREA DE TRABALHO</span>
      <Link
        href="/admin"
        className={`hs-overview-link ${pathname === '/admin' ? 'is-active' : ''}`}
        aria-current={pathname === '/admin' ? 'page' : undefined}
      >
        <BI name="grid-1x2" />
        Visão geral
      </Link>
      {(hasPermission(user, 'site') || hasPermission(user, 'brand')) && (
        <Link
          className={`hs-work-nav ${pathname === '/admin/site' ? 'is-active' : ''}`}
          href="/admin/site"
        >
          <BI name="pencil-square" />
          Editar meu site
        </Link>
      )}
      {hasPermission(user, 'quotes') && (
        <Link
          className={`hs-work-nav ${pathname.includes('/inbox') || pathname.includes('/quotes') ? 'is-active' : ''}`}
          href="/admin/inbox"
        >
          <BI name="chat-left-text" />
          Pedidos recebidos
        </Link>
      )}
      {isAdmin(user) && (
        <Link
          className={`hs-work-nav ${pathname.includes('/team') || pathname.includes('/users') ? 'is-active' : ''}`}
          href="/admin/team"
        >
          <BI name="people" />
          Equipe e permissões
        </Link>
      )}
    </div>
  )
}

export function NavFooter() {
  const { user } = useAuth()
  return (
    <div className="hs-nav-footer">
      <div className="hs-nav-note">
        <BI name="shield-check" />
        <span>
          Gestão do seu site
          <br />
          <small>HS Logística e Armazenagem</small>
        </span>
      </div>
      <Link href="/admin/account" className="hs-profile">
        <span className="hs-avatar">
          {String(user?.name || 'HS')
            .slice(0, 2)
            .toUpperCase()}
        </span>
        <span>
          <strong>{String(user?.name || 'Minha conta')}</strong>
          <small>{ROLE_LABELS[user?.role || ''] || 'Equipe HS'}</small>
        </span>
        <BI name="gear" />
      </Link>
    </div>
  )
}

export function HeaderAction({ siteUrl }: { siteUrl?: string }) {
  return (
    <a
      className="hs-site-link"
      href={siteUrl || '/'}
      target="_blank"
      rel="noopener noreferrer"
    >
      Ver site
      <BI name="arrow-up-right" />
    </a>
  )
}

export function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  return (
    <button
      type="button"
      className="hs-button hs-button-light"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <BI name="arrow-clockwise" />
      {pending ? 'Atualizando…' : 'Atualizar'}
    </button>
  )
}

export function LoginIntro() {
  return (
    <div className="hs-login-intro">
      <span className="hs-eyebrow">BEM-VINDO À HS</span>
      <h1>
        Seu próximo passo
        <br />
        começa aqui.
      </h1>
      <p>
        Acesse sua conta para cuidar do conteúdo do site e acompanhar novas
        oportunidades.
      </p>
    </div>
  )
}

export function LoginFooter({ emailRecovery = false }: { emailRecovery?: boolean }) {
  return (
    <div>
    {!emailRecovery && <p className="hs-login-help">Esqueceu sua senha? Peça a um administrador para redefini-la em Equipe e permissões.</p>}
    <p className={`hs-login-footer ${emailRecovery ? '' : 'hs-login-footer--no-email'}`}>
      <BI name="shield-check" />
      Acesso exclusivo da equipe HS Logística
    </p>
    </div>
  )
}
