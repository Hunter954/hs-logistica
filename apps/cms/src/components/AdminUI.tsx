'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth, useNav, usePreferences } from '@payloadcms/ui'

export function BI({ name, className = '' }: { name: string; className?: string }) {
  return <span aria-hidden="true" className={`hs-icon ${className}`} style={{ maskImage: `url(/icons/${name}.svg)`, WebkitMaskImage: `url(/icons/${name}.svg)` }} />
}

export function NavBrand() {
  const pathname = usePathname()
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
    return () => { cancelled = true; cancelAnimationFrame(frame) }
  }, [hydrated, getPreference, setNavOpen])
  return <div className="hs-nav-intro">
    <Link href="/admin" className="hs-brand"><span className="hs-brand-logo"><img src="/logo.png" alt="HS" /></span><span><strong>HS Logística</strong><small>PAINEL DE GESTÃO</small></span></Link>
    <span className="hs-nav-caption">ÁREA DE TRABALHO</span>
    <Link href="/admin" className={`hs-overview-link ${pathname === '/admin' ? 'is-active' : ''}`} aria-current={pathname === '/admin' ? 'page' : undefined}><BI name="grid-1x2" />Visão geral</Link>
  </div>
}

export function NavFooter() {
  const { user } = useAuth()
  return <div className="hs-nav-footer"><div className="hs-nav-note"><BI name="shield-check" /><span>Gestão do seu site<br /><small>HS Logística e Armazenagem</small></span></div><Link href="/admin/account" className="hs-profile"><span className="hs-avatar">{String(user?.name || 'HS').slice(0, 2).toUpperCase()}</span><span><strong>{String(user?.name || 'Minha conta')}</strong><small>{user?.role === 'admin' ? 'Administrador' : 'Editor'}</small></span><BI name="gear" /></Link></div>
}

export function HeaderAction({ siteUrl }: { siteUrl?: string }) {
  return <a className="hs-site-link" href={siteUrl || '/'} target="_blank" rel="noopener noreferrer">Ver site<BI name="arrow-up-right" /></a>
}

export function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  return <button type="button" className="hs-button hs-button-light" disabled={pending} onClick={() => startTransition(() => router.refresh())}><BI name="arrow-clockwise" />{pending ? 'Atualizando…' : 'Atualizar'}</button>
}

export function LoginIntro() {
  return <div className="hs-login-intro"><span className="hs-eyebrow">BEM-VINDO À HS</span><h1>Seu próximo passo<br />começa aqui.</h1><p>Acesse sua conta para cuidar do conteúdo do site e acompanhar novas oportunidades.</p></div>
}

export function LoginFooter() {
  return <p className="hs-login-footer"><BI name="shield-check" />Acesso exclusivo da equipe HS Logística</p>
}
