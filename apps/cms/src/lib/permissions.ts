export const PERMISSIONS = [
  { value: 'site', label: 'Editar página inicial' },
  { value: 'brand', label: 'Editar marca, menus, contato e SEO' },
  { value: 'blog', label: 'Criar e editar artigos e categorias' },
  { value: 'publish', label: 'Publicar e retirar artigos do ar' },
  { value: 'media', label: 'Enviar e gerenciar imagens' },
  { value: 'quotes', label: 'Atender pedidos de cotação' },
  { value: 'export', label: 'Exportar contatos em CSV' },
] as const
export type Permission = (typeof PERMISSIONS)[number]['value']
export type Actor =
  | {
      id?: number | string
      role?: string | null
      active?: boolean | null
      permissions?: string[] | null
      name?: string | null
      email?: string
    }
  | null
  | undefined
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor de conteúdo',
  atendimento: 'Atendimento',
  personalizado: 'Personalizado',
}
export function hasPermission(user: Actor, permission: Permission): boolean {
  if (!user || user.active === false) return false
  if (user.role === 'admin') return true
  if (user.role === 'editor')
    return ['site', 'brand', 'blog', 'publish', 'media'].includes(permission)
  if (user.role === 'atendimento') return permission === 'quotes'
  return (
    user.role === 'personalizado' && !!user.permissions?.includes(permission)
  )
}
export const activeUser = (user: Actor): boolean =>
  !!user && user.active !== false
export const isAdmin = (user: Actor): boolean =>
  activeUser(user) && user?.role === 'admin'
