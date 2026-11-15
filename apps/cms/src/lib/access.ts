// Regras de acesso. Nada é público por omissão: cada collection e global declara as suas.
import { timingSafeEqual } from 'node:crypto'
import type { Access, FieldAccess, PayloadRequest } from 'payload'
import { env } from './env'
import {
  activeUser,
  hasPermission,
  isAdmin,
  type Permission,
} from './permissions'

type Role = 'admin' | 'editor'
const role = (req: PayloadRequest): Role | undefined =>
  (req.user as { role?: Role } | null)?.role

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a),
    y = Buffer.from(b)
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y)
}
export const anyone: Access = () => true
export const loggedIn: Access = ({ req }) => activeUser(req.user)
export const adminOnly: Access = ({ req }) => isAdmin(req.user)
export const adminOnlyField: FieldAccess = ({ req }) => isAdmin(req.user)
export const can =
  (permission: Permission): Access =>
  ({ req }) =>
    hasPermission(req.user, permission)
export const canField =
  (permission: Permission): FieldAccess =>
  ({ req }) =>
    hasPermission(req.user, permission)

/** O servidor do site lê rascunhos para a prévia ao vivo, identificando-se com o PREVIEW_SECRET. */
const sitePreview = (req: PayloadRequest): boolean =>
  safeEqual(req.headers.get('x-preview-secret') || '', env.previewSecret)

/** Visitante só enxerga o que está publicado; quem está logado (ou a prévia do site) enxerga rascunhos também. */
export const publishedOrLoggedIn: Access = ({ req }) =>
  hasPermission(req.user, 'blog') || sitePreview(req)
    ? true
    : { _status: { equals: 'published' } }

/** Admin vê e edita qualquer usuário; os demais, só a própria conta. */
export const adminOrSelf: Access = ({ req }) => {
  if (!activeUser(req.user)) return false
  return isAdmin(req.user) ? true : { id: { equals: req.user!.id } }
}

/** Cotações só entram pelo proxy do site (que aplica o limite por IP) ou por alguém logado no admin. */
export const viaSiteProxy: Access = ({ req }) =>
  !req.user &&
  safeEqual(req.headers.get('x-quote-secret') || '', env.quoteProxySecret)
