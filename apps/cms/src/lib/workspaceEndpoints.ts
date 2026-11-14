import {
  APIError,
  type Endpoint,
  type PayloadRequest,
  type Where,
} from 'payload'
import { activeUser, hasPermission, isAdmin, PERMISSIONS } from './permissions'
import { env } from './env'
import { audit } from '../hooks/audit'

const noStore = { 'Cache-Control': 'no-store' }
const json = (data: unknown) => Response.json(data, { headers: noStore })
const directory = async (req: PayloadRequest) => {
  const users = await req.payload.find({
    collection: 'users',
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  // Names remain available for historical assignments after a person changes
  // role or is disabled. No email, permission list or authentication data leaks.
  return users.docs.map((u) => ({ id: u.id, name: u.name, active: u.active !== false, canAttend: hasPermission(u, 'quotes') }))
}
function filters(q: URLSearchParams, userId: string | number): Where {
  const and: Where[] = []
  const search = (q.get('search') || '').trim().slice(0, 120)
  if (search)
    and.push({
      or: ['name', 'contact', 'service', 'message'].map((key) => ({
        [key]: { contains: search },
      })),
    })
  const status = q.get('status')
  if (
    status &&
    ['novo', 'em contato', 'fechado', 'descartado'].includes(status)
  )
    and.push({ status: { equals: status } })
  const service = q.get('service')?.trim().slice(0, 120)
  if (service) and.push({ service: { equals: service } })
  const owner = q.get('owner')
  if (owner === 'mine') and.push({ assignedTo: { equals: userId } })
  else if (owner === 'none') and.push({ assignedTo: { exists: false } })
  else if (owner && /^\d+$/.test(owner))
    and.push({ assignedTo: { equals: Number(owner) } })
  if (['normal', 'alta'].includes(q.get('priority') || ''))
    and.push({ priority: { equals: q.get('priority') } })
  for (const key of ['from', 'to']) {
    const value = q.get(key)
    if (
      value &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value))
    )
      and.push({
        createdAt: {
          [key === 'from' ? 'greater_than_equal' : 'less_than_equal']:
            `${value}T${key === 'from' ? '00:00:00.000' : '23:59:59.999'}-03:00`,
        },
      })
  }
  if (q.get('overdue') === '1')
    and.push({
      and: [
        { followUp: { less_than: new Date().toISOString() } },
        { status: { in: ['novo', 'em contato'] } },
      ],
    })
  return and.length ? { and } : {}
}
const csv = (value: unknown) => {
  let s = String(value ?? '')
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}

export const workspaceEndpoints: Endpoint[] = [
  {
    path: '/site-sync',
    method: 'post',
    handler: async (req) => {
      if (
        !['site', 'brand', 'blog', 'media'].some((p) =>
          hasPermission(req.user, p as any),
        )
      )
        throw new APIError('Sem permissão para atualizar o site.', 403)
      if (req.headers.get('origin') !== env.cmsUrl)
        throw new APIError('Origem inválida.', 403)
      const response = await fetch(env.siteUrl + '/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': env.revalidateSecret,
        },
        body: '{}',
        signal: AbortSignal.timeout(20000),
      })
      if (!response.ok)
        throw new APIError(
          'O conteúdo foi salvo, mas o site não confirmou a atualização. Tente atualizar a publicação novamente.',
          502,
        )
      return json({ ok: true })
    },
  },
  {
    path: '/workspace',
    method: 'get',
    handler: async (req) => {
      if (!activeUser(req.user))
        throw new APIError('Entre com uma conta ativa.', 401)
      return json({
        user: { id: req.user!.id, name: req.user!.name, role: req.user!.role },
        permissions: PERMISSIONS.filter((p) =>
          hasPermission(req.user, p.value),
        ).map((p) => p.value),
        admin: isAdmin(req.user),
        agents: hasPermission(req.user, 'quotes') ? await directory(req) : [],
        siteUrl: env.siteUrl,
      })
    },
  },
  {
    path: '/inbox',
    method: 'get',
    handler: async (req) => {
      if (!hasPermission(req.user, 'quotes'))
        throw new APIError('Você não tem acesso às cotações.', 403)
      const q = new URL(req.url!).searchParams
      const where = filters(q, req.user!.id)
      const scope = { req, overrideAccess: false as const }
      if (q.get('format') === 'csv') {
        if (!hasPermission(req.user, 'export'))
          throw new APIError('Seu perfil não permite exportar contatos.', 403)
        const lines = [
          [
            'Código',
            'Recebido em',
            'Cliente',
            'Contato',
            'Serviço',
            'Mensagem',
            'Situação',
            'Prioridade',
            'Responsável',
            'Próximo retorno',
          ],
        ]
        let page = 1,
          pages = 1
        const agents = await directory(req)
        do {
          const result = await req.payload.find({
            collection: 'quotes',
            where,
            limit: 200,
            page,
            sort: '-createdAt',
            depth: 0,
            ...scope,
          })
          for (const d of result.docs)
            lines.push([
              String(d.id),
              d.createdAt,
              d.name,
              d.contact,
              d.service || '',
              d.message || '',
              d.status,
              d.priority || 'normal',
              agents.find(a => String(a.id) === String(d.assignedTo))?.name || '',
              d.followUp || '',
            ])
          pages = result.totalPages
          page++
          if (page > 251)
            throw new APIError(
              'Use um período menor para exportar até 50 mil pedidos por arquivo.',
              400,
            )
        } while (page <= pages)
        await audit(
          req,
          'quotes',
          'export',
          'csv',
          `Exportou ${lines.length - 1} cotações com os filtros selecionados.`,
        )
        return new Response(
          '\uFEFF' + lines.map((line) => line.map(csv).join(';')).join('\r\n'),
          {
            headers: {
              ...noStore,
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': 'attachment; filename="cotacoes-hs.csv"',
            },
          },
        )
      }
      const page = Math.max(1, Math.min(100000, Math.floor(Number(q.get('page')) || 1)))
      const [result, total, novo, contato, fechado, overdue, home, agents] =
        await Promise.all([
          req.payload.find({
            collection: 'quotes',
            where,
            page,
            limit: 20,
            select: { name: true, contact: true, service: true, status: true, priority: true, assignedTo: true, followUp: true, createdAt: true },
            sort: q.get('sort') === 'oldest' ? 'createdAt' : '-createdAt',
            depth: 0,
            ...scope,
          }),
          req.payload.count({ collection: 'quotes', ...scope }),
          req.payload.count({
            collection: 'quotes',
            where: { status: { equals: 'novo' } },
            ...scope,
          }),
          req.payload.count({
            collection: 'quotes',
            where: { status: { equals: 'em contato' } },
            ...scope,
          }),
          req.payload.count({
            collection: 'quotes',
            where: { status: { equals: 'fechado' } },
            ...scope,
          }),
          req.payload.count({
            collection: 'quotes',
            where: {
              and: [
                { followUp: { less_than: new Date().toISOString() } },
                { status: { in: ['novo', 'em contato'] } },
              ],
            },
            ...scope,
          }),
          req.payload.findGlobal({ slug: 'home', depth: 0, ...scope }),
          directory(req),
        ])
      return json({
        ...result,
        summary: {
          total: total.totalDocs,
          novo: novo.totalDocs,
          contato: contato.totalDocs,
          fechado: fechado.totalDocs,
          overdue: overdue.totalDocs,
        },
        services: home.services?.items?.map((s) => s.t) || [],
        agents,
      })
    },
  },
  {
    path: '/team/:id/revoke',
    method: 'post',
    handler: async (req) => {
      if (!isAdmin(req.user))
        throw new APIError('Apenas administradores gerenciam sessões.', 403)
      if (req.headers.get('origin') !== env.cmsUrl)
        throw new APIError('Origem inválida.', 403)
      const id = Number(req.routeParams?.id)
      if (!Number.isSafeInteger(id) || id < 1)
        throw new APIError('Conta inválida.', 400)
      await req.payload.findByID({ collection: 'users', id, overrideAccess: false, req })
      // Auth session fields reject ordinary updates. Use the same adapter operation
      // as Payload's logout implementation after the admin and origin checks above.
      await req.payload.db.updateOne({
        collection: 'users',
        id,
        data: { sessions: [] },
        req,
        returning: false,
      })
      await audit(
        req,
        'users',
        'revoke',
        String(id),
        'Encerrou as sessões da conta.',
      )
      return json({ ok: true })
    },
  },
]
