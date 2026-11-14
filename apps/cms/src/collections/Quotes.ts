import { APIError, type CollectionConfig } from 'payload'
import { can, viaSiteProxy } from '../lib/access'
import { hasPermission } from '../lib/permissions'
import { notifyQuote } from '../hooks/notifyQuote'

const cut =
  (max: number) =>
  ({ value }: { value?: unknown }): string =>
    String(value ?? '')
      .slice(0, max)
      .trim()

export const Quotes: CollectionConfig = {
  slug: 'quotes',
  labels: { singular: 'Pedido de cotação', plural: 'Pedidos de cotação' },
  admin: {
    group: 'Cotações',
    useAsTitle: 'name',
    defaultColumns: [
      'name',
      'contact',
      'service',
      'status',
      'assignedTo',
      'createdAt',
    ],
    description:
      'Caixa de entrada dos pedidos enviados pelo site. Dados do cliente são preservados.',
    components: {
      views: { list: { Component: '/components/workspace/Inbox#Inbox' } },
    },
  },
  access: {
    create: viaSiteProxy,
    read: can('quotes'),
    update: can('quotes'),
    delete: () => false,
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        const at = new Date().toISOString()
        if (operation === 'create') {
          data.status = 'novo'
          data.priority = 'normal'
          data.assignedTo = null
          data.followUp = null
          data.notes = ''
          data.source = 'site'
          data.history = [
            {
              at,
              actor: 'Site',
              text: 'Pedido recebido pelo formulário do site.',
            },
          ]
        } else {
          for (const key of ['name', 'contact', 'service', 'message', 'source', 'createdAt'])
            if (data[key] !== undefined && data[key] !== originalDoc[key])
              throw new APIError(
                'Os dados enviados pelo cliente não podem ser alterados.',
                400,
              )
          if (
            data.expectedUpdatedAt &&
            data.expectedUpdatedAt !== originalDoc.updatedAt
          )
            throw new APIError(
              'Este pedido foi atualizado por outra pessoa. Feche e reabra para carregar a versão atual.',
              409,
            )
          delete data.expectedUpdatedAt
          const entries = Array.isArray(originalDoc.history)
            ? [...originalDoc.history]
            : []
          const actor = req.user?.name || req.user?.email || 'Equipe HS'
          for (const [key, label] of Object.entries({
            status: 'Situação',
            priority: 'Prioridade',
            assignedTo: 'Responsável',
            followUp: 'Próximo retorno',
            notes: 'Notas internas',
          })) {
            if (
              data[key] !== undefined &&
              String(data[key] ?? '') !== String(originalDoc[key] ?? '')
            ) {
              let value = data[key]
              if (key === 'assignedTo' && value) {
                const assigned = await req.payload.findByID({
                  collection: 'users',
                  id: value,
                  overrideAccess: true,
                  req,
                })
                if (!hasPermission(assigned, 'quotes'))
                  throw new APIError(
                    'Escolha um responsável ativo com acesso às cotações.',
                    400,
                  )
                value = assigned.name
              }
              entries.push({
                at,
                actor,
                text:
                  key === 'notes'
                    ? `Notas internas: ${String(value || 'removidas').slice(0, 2000)}`
                    : `${label}: ${value || 'não definido'}`,
              })
            }
          }
        data.history = entries
        }
        return data
      },
    ],
    afterChange: [notifyQuote],
  },
  fields: [
    {
      name: 'name',
      label: 'Nome ou empresa',
      type: 'text',
      required: true,
      maxLength: 120,
      hooks: { beforeValidate: [cut(120)] },
      access: { update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'contact',
      label: 'Telefone ou e-mail',
      type: 'text',
      required: true,
      maxLength: 120,
      hooks: { beforeValidate: [cut(120)] },
      access: { update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'service',
      label: 'Serviço',
      type: 'text',
      maxLength: 120,
      hooks: { beforeValidate: [cut(120)] },
      access: { update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'message',
      label: 'Sobre a carga',
      type: 'textarea',
      maxLength: 2000,
      hooks: { beforeValidate: [cut(2000)] },
      access: { update: () => false },
      admin: { readOnly: true },
    },
    {
      name: 'status',
      label: 'Situação',
      type: 'select',
      required: true,
      defaultValue: 'novo',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Novo', value: 'novo' },
        { label: 'Em contato', value: 'em contato' },
        { label: 'Fechado', value: 'fechado' },
        { label: 'Descartado', value: 'descartado' },
      ],
      // quem envia pelo site não escolhe a situação
      access: { create: () => false },
    },
    {
      name: 'priority',
      label: 'Prioridade',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'Alta', value: 'alta' },
      ],
      admin: { position: 'sidebar' },
      access: { create: () => false },
    },
    {
      name: 'assignedTo',
      label: 'Responsável',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
      access: { create: () => false },
    },
    {
      name: 'followUp',
      label: 'Próximo retorno',
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
      access: { create: () => false },
    },
    {
      name: 'notes',
      label: 'Notas internas',
      type: 'textarea',
      maxLength: 2000,
      admin: {
        description: 'Informações da equipe. Não são enviadas ao cliente.',
      },
      access: { create: () => false },
    },
    {
      name: 'source',
      label: 'Origem',
      type: 'text',
      defaultValue: 'site',
      admin: { readOnly: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'history',
      label: 'Histórico do atendimento',
      type: 'json',
      admin: { readOnly: true, hidden: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'expectedUpdatedAt',
      type: 'text',
      virtual: true,
      admin: { hidden: true },
    },
  ],
}
