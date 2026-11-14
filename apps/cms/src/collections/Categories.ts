import type { CollectionConfig } from 'payload'
import { anyone, can } from '../lib/access'
import { auditCollection } from '../hooks/audit'
import { hasPermission } from '../lib/permissions'
import { slugFrom } from '../lib/slug'
import { revalidateAlways, revalidateDelete } from '../hooks/revalidate'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Categoria', plural: 'Categorias' },
  admin: {
    group: 'Blog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug'],
    hidden: ({ user }) => !hasPermission(user, 'blog'),
  },
  access: {
    read: anyone,
    create: can('blog'),
    update: can('blog'),
    delete: can('blog'),
  },
  hooks: {
    afterChange: [revalidateAlways, auditCollection],
    afterDelete: [revalidateDelete],
  },
  fields: [
    { name: 'title', label: 'Nome', type: 'text', required: true },
    {
      name: 'slug',
      label: 'Endereço',
      type: 'text',
      unique: true,
      index: true,
      hooks: { beforeValidate: [slugFrom('title')] },
      admin: {
        position: 'sidebar',
        description:
          'Parte final do link. Se ficar vazio, é criado a partir do nome.',
      },
    },
  ],
}
