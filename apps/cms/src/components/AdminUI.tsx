'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, useNav } from '@payloadcms/ui'
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
  const { hydrated, navOpen, setNavOpen } = useNav()
  React.useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1100px)')
    const keepOpen = () => {
      if (hydrated && desktop.matches && !navOpen) setNavOpen(true)
    }
    keepOpen()
    desktop.addEventListener('change', keepOpen)
    return () => desktop.removeEventListener('change', keepOpen)
  }, [hydrated, navOpen, setNavOpen])
  React.useEffect(() => {
    document.querySelectorAll<HTMLElement>('.nav__link').forEach((link) => {
      const href = link.getAttribute('href') || (link.id.startsWith('nav-global-') ? '/admin/globals/' + link.id.slice(11) : link.id.startsWith('nav-') ? '/admin/collections/' + link.id.slice(4) : '')
      const active = !!href && (pathname === href || pathname.startsWith(href + '/'))
      link.classList.toggle('hs-nav-active', active)
      if (active) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
  }, [pathname])
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
  const pathname = usePathname()
  return (
    <div className="hs-nav-footer">
      <Link href="/admin/account" className={`hs-profile ${pathname === '/admin/account' ? 'is-active' : ''}`} aria-current={pathname === '/admin/account' ? 'page' : undefined}>
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
