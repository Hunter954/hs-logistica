import { APIError, type CollectionConfig } from 'payload'
import { adminOnly, adminOnlyField, adminOrSelf } from '../lib/access'
import { activeUser, isAdmin, PERMISSIONS } from '../lib/permissions'
import { audit, auditCollection } from '../hooks/audit'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Usuário', plural: 'Usuários' },
  admin: {
    useAsTitle: 'name',
    group: 'Configurações',
    defaultColumns: ['name', 'email', 'role', 'active'],
    hidden: ({ user }) => !isAdmin(user),
    description:
      'Perfis controlam o acesso real às áreas do painel. Desative contas para preservar o histórico.',
    components: {
      views: { list: { Component: '/components/workspace/Team#Team' } },
    },
  },
  auth: {
    tokenExpiration: 60 * 60 * 12,
    maxLoginAttempts: 8,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    admin: ({ req }) => activeUser(req.user),
    read: adminOrSelf,
    create: adminOnly,
    update: adminOrSelf,
    delete: adminOnly,
    unlock: adminOnly,
  },
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if (user.active === false)
          throw new APIError(
            'Esta conta está desativada. Fale com um administrador.',
            403,
          )
        return user
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        if (operation === 'update' && originalDoc && req.user) {
          const changingAccess =
            (data.role && data.role !== originalDoc.role) ||
            (data.active !== undefined && data.active !== originalDoc.active) ||
            (data.permissions !== undefined &&
              JSON.stringify(data.permissions) !==
                JSON.stringify(originalDoc.permissions))
          if (
            String(req.user.id) === String(originalDoc.id) &&
            (data.active === false ||
              (data.role &&
                data.role !== 'admin' &&
                originalDoc.role === 'admin'))
          )
            throw new APIError(
              'Você não pode desativar a própria conta nem remover sua própria administração.',
              400,
            )
          if (
            originalDoc.role === 'admin' &&
            originalDoc.active !== false &&
            (data.active === false || (data.role && data.role !== 'admin'))
          ) {
            const admins = await req.payload.count({
              collection: 'users',
              where: {
                and: [
                  { role: { equals: 'admin' } },
                  { active: { not_equals: false } },
                ],
              },
              overrideAccess: true,
              req,
            })
            if (admins.totalDocs <= 1)
              throw new APIError(
                'Mantenha pelo menos um administrador ativo.',
                400,
              )
          }
          if (changingAccess || data.password) data.sessions = []
        }
        if (data.password && String(data.password).length < 12)
          throw new APIError('Use uma senha com pelo menos 12 caracteres.', 400)
        if ((data.role || originalDoc?.role) === 'personalizado') {
          const permissions = data.permissions || originalDoc?.permissions || []
          if (permissions.includes('publish') && !permissions.includes('blog'))
            throw new APIError(
              'Para publicar artigos, conceda também acesso ao blog.',
              400,
            )
          if (permissions.includes('export') && !permissions.includes('quotes'))
            throw new APIError(
              'Para exportar contatos, conceda também acesso às cotações.',
              400,
            )
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        if (String(id) === String(req.user?.id))
          throw new APIError('Você não pode excluir a própria conta.', 400)
        const target = await req.payload.findByID({
          collection: 'users',
          id,
          overrideAccess: true,
          req,
        })
        if (target.role === 'admin' && target.active !== false) {
          const count = await req.payload.count({
            collection: 'users',
            where: {
              and: [
                { role: { equals: 'admin' } },
                { active: { not_equals: false } },
              ],
            },
            overrideAccess: true,
            req,
          })
          if (count.totalDocs <= 1)
            throw new APIError(
              'O último administrador ativo não pode ser excluído.',
              400,
            )
        }
        const [quotes, posts] = await Promise.all([
          req.payload.count({
            collection: 'quotes',
            where: { assignedTo: { equals: id } },
            overrideAccess: true,
            req,
          }),
          req.payload.count({
            collection: 'posts',
            where: { author: { equals: id } },
            overrideAccess: true,
            req,
          }),
        ])
        if (quotes.totalDocs || posts.totalDocs)
          throw new APIError(
            'Esta conta tem registros vinculados. Desative-a para preservar o histórico.',
            400,
          )
        await audit(req, 'users', 'delete', String(id), `Excluiu a conta ${target.name}.`)
      },
    ],
    afterChange: [auditCollection],
  },
  fields: [
    { name: 'name', label: 'Nome', type: 'text', required: true },
    {
      name: 'role',
      label: 'Papel',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Administrador — gestão completa e equipe', value: 'admin' },
        { label: 'Editor de conteúdo — site, blog e imagens', value: 'editor' },
        {
          label: 'Atendimento — pedidos recebidos pelo site',
          value: 'atendimento',
        },
        {
          label: 'Personalizado — escolha as permissões',
          value: 'personalizado',
        },
      ],
      access: { create: adminOnlyField, update: adminOnlyField },
    },
    {
      name: 'permissions',
      label: 'Permissões específicas',
      type: 'select',
      hasMany: true,
      options: [...PERMISSIONS],
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: {
        condition: (_, data) => data.role === 'personalizado',
        description:
          'Aplicadas apenas ao perfil Personalizado. Publicar artigos e exportar contatos são permissões separadas.',
      },
    },
    {
      name: 'active',
      label: 'Conta ativa',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: {
        position: 'sidebar',
        description: 'Ao desativar, todas as sessões são encerradas.',
      },
    },
  ],
}
