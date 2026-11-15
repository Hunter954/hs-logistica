import path from 'node:path'
import { APIError, type CollectionConfig } from 'payload'
import { anyone, can } from '../lib/access'
import { revalidateAlways } from '../hooks/revalidate'
import { auditCollection } from '../hooks/audit'
import { hasPermission } from '../lib/permissions'

const MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const EXT = /\.(jpe?g|png|webp|avif)$/i

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Imagem', plural: 'Imagens' },
  admin: {
    components: { views: { list: { Component: '/components/workspace/Management#MediaLibrary' } } },
    group: 'Configurações',
    useAsTitle: 'alt',
    hidden: ({ user }) => !hasPermission(user, 'media'),
    description:
      'Use descrições claras. Imagens utilizadas no site ou no blog são protegidas contra exclusão.',
  },
  access: {
    read: anyone,
    create: can('media'),
    update: can('media'),
    delete: can('media'),
  },
  upload: {
    pasteURL: false,
    staticDir: path.resolve(process.cwd(), 'media'),
    mimeTypes: MIME,
    adminThumbnail: 'thumb',
    focalPoint: true,
    // tamanhos gerados em WebP; o site escolhe o que cabe em cada lugar
    imageSizes: [
      {
        name: 'thumb',
        width: 400,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'card',
        width: 800,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'hero',
        width: 1600,
        formatOptions: { format: 'webp', options: { quality: 78 } },
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        position: 'centre',
        formatOptions: { format: 'webp', options: { quality: 80 } },
      },
    ],
  },
  hooks: {
    afterChange: [revalidateAlways, auditCollection],
    beforeDelete: [
      async ({ id, req }) => {
        const [home, settings, posts] = await Promise.all([
          req.payload.findGlobal({
            slug: 'home',
            depth: 0,
            overrideAccess: true,
            req,
          }),
          req.payload.findGlobal({
            slug: 'site-settings',
            depth: 0,
            overrideAccess: true,
            req,
          }),
          req.payload.find({
            collection: 'posts',
            pagination: false,
            depth: 0,
            overrideAccess: true,
            req,
          }),
        ])
        const same = (value: unknown) =>
          String(
            value && typeof value === 'object' && 'id' in value
              ? value.id
              : value,
          ) === String(id)
        const lexicalUses = (value: unknown): boolean => {
          if (!value || typeof value !== 'object') return false
          if (
            'relationTo' in value &&
            value.relationTo === 'media' &&
            'value' in value &&
            same(value.value)
          )
            return true
          return Object.values(value).some((v) =>
            Array.isArray(v) ? v.some(lexicalUses) : lexicalUses(v),
          )
        }
        if (
          same(home.hero?.photo) ||
          home.photos?.some((p) => same(p.image)) ||
          same(settings.brand?.logo) ||
          same(settings.seo?.image) ||
          same(home.meta?.image) ||
          posts.docs.some(
            (p) =>
              same(p.cover) || same(p.meta?.image) || lexicalUses(p.content),
          )
        )
          throw new APIError(
            'Esta imagem está em uso no site ou em um artigo. Substitua-a nesses locais antes de excluir.',
            400,
          )
      },
    ],
    // o tipo do arquivo já é conferido pelo Payload; aqui confere-se também a extensão
    beforeOperation: [
      ({ operation, req }) => {
        if (
          (operation === 'create' || operation === 'update') &&
          req.file &&
          !EXT.test(req.file.name)
        ) {
          throw new APIError('Envie uma imagem JPG, PNG, WebP ou AVIF.', 400)
        }
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      label: 'Descrição da imagem',
      type: 'text',
      required: true,
      admin: {
        description:
          'O que aparece na imagem, em uma frase. É lida por leitores de tela e pelo Google.',
      },
    },
  ],
}
