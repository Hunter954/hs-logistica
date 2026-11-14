'use client'
import React from 'react'
import { BI } from '../AdminUI'

export async function request<T = any>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const r = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    },
  })
  const data = await r.json()
  if (!r.ok)
    throw new Error(
      data.errors
        ?.map(
          (e: any) =>
            e.data?.errors?.map((f: any) => f.message).join(' · ') || e.message,
        )
        .join(' · ') ||
        data.message ||
        'Não foi possível concluir. Tente novamente.',
    )
  return data
}
export function useWorkspace() {
  const [data, setData] = React.useState<any>(null)
  const [error, setError] = React.useState('')
  React.useEffect(() => {
    let live = true
    request('/api/workspace')
      .then((d) => {
        if (live) setData(d)
      })
      .catch((e) => {
        if (live) setError(e.message)
      })
    return () => {
      live = false
    }
  }, [])
  return { data, error }
}
export const formatDate = (v?: string | null, time = false) =>
  v
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(v))
    : 'Não definido'
export const STATUS: Record<string, string> = {
  novo: 'Novo',
  'em contato': 'Em contato',
  fechado: 'Fechado',
  descartado: 'Descartado',
}
export function Notice({
  text,
  kind = 'error',
}: {
  text?: string
  kind?: 'error' | 'success'
}) {
  return text ? (
    <div
      className={`hs-notice hs-notice-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
    >
      <BI name={kind === 'error' ? 'shield-check' : 'check-circle'} />
      {text}
    </div>
  ) : null
}
export function Loading() {
  return (
    <div className="hs-loading" role="status">
      <BI name="arrow-clockwise" />
      Carregando sua área de trabalho…
    </div>
  )
}
export function Modal({
  title,
  close,
  children,
  wide = false,
}: {
  title: string
  close: () => void
  children: React.ReactNode
  wide?: boolean
}) {
  const ref = React.useRef<HTMLDialogElement>(null)
  React.useEffect(() => {
    const el = ref.current
    el?.showModal()
    return () => el?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`hs-dialog ${wide ? 'hs-dialog-wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <header>
        <div>
          <span className="hs-eyebrow">HS LOGÍSTICA · GESTÃO</span>
          <h2>{title}</h2>
        </div>
        <button
          className="hs-icon-button"
          type="button"
          aria-label="Fechar"
          onClick={close}
        >
          ×
        </button>
      </header>
      {children}
    </dialog>
  )
}
export function useUnsaved(dirty: boolean) {
  React.useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest(
        'a[href]',
      ) as HTMLAnchorElement | null
      if (
        dirty &&
        a &&
        !a.target &&
        !a.href.startsWith('javascript:') &&
        !window.confirm('Há alterações não salvas. Deseja sair e descartá-las?')
      ) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', leave)
    document.addEventListener('click', click, true)
    return () => {
      window.removeEventListener('beforeunload', leave)
      document.removeEventListener('click', click, true)
    }
  }, [dirty])
}
