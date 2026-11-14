import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

export const Activity: CollectionConfig = {
  slug: 'activity',
  labels: { singular: 'Atividade', plural: 'Histórico de atividades' },
  admin: {
    group: 'Configurações',
    useAsTitle: 'summary',
    defaultColumns: ['createdAt', 'actor', 'area', 'summary'],
    description:
      'Registro de ações da equipe. Não inclui senhas nem conteúdo privado das cotações.',
  },
  access: {
    read: adminOnly,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'actor',
      label: 'Responsável',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      name: 'area',
      label: 'Área',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'action',
      label: 'Ação',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'target',
      label: 'Registro',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'summary',
      label: 'Descrição',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
  ],
}
