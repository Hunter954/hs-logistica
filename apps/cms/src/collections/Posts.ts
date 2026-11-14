import { APIError, type CollectionConfig } from 'payload'
import {
  lexicalEditor,
  LinkFeature,
  UploadFeature,
} from '@payloadcms/richtext-lexical'
import { can, publishedOrLoggedIn } from '../lib/access'
import { hasPermission } from '../lib/permissions'
import { auditCollection } from '../hooks/audit'
import { slugFrom } from '../lib/slug'
import { postHtml, readingMinutes } from '../lib/postHtml'
import { previewUrl } from '../lib/preview'
import { revalidateDelete, revalidatePost } from '../hooks/revalidate'

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  admin: {
    hidden: ({ user }) => !hasPermission(user, 'blog'),
    components: {
      views: { list: { Component: '/components/workspace/BlogHub#BlogHub' } },
    },
    group: 'Blog',
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'publishedAt', 'categories'],
    livePreview: {
      url: ({ data }) => previewUrl('post', String(data?.id || '')),
    },
  },
  access: {
    read: publishedOrLoggedIn,
    create: can('blog'),
    update: can('blog'),
    delete: can('blog'),
  },
  versions: {
    drafts: { autosave: { interval: 1500 }, schedulePublish: true },
    maxPerDoc: 25,
  },
  defaultSort: '-publishedAt',
  hooks: {
    beforeChange: [
      ({ data, originalDoc, req }) => {
        if (
          req.user &&
          !hasPermission(req.user, 'publish') &&
          (data._status === 'published' ||
            (originalDoc?._status === 'published' &&
              req.query?.draft !== 'true' &&
              req.query?.draft !== true))
        )
          throw new APIError(
            'Seu perfil permite editar rascunhos. Peça a um responsável com permissão para publicar.',
            403,
          )
        if (
          data._status === 'published' &&
          !postHtml(data.content ?? originalDoc?.content)
            .replace(/<[^>]*>/g, '')
            .trim()
        )
          throw new APIError(
            'Escreva o conteúdo do artigo antes de publicar.',
            400,
          )
        // a data de publicação é a da primeira vez que o post vai ao ar, se ninguém escolheu outra
        if (
          data._status === 'published' &&
          !data.publishedAt &&
          !originalDoc?.publishedAt
        )
          data.publishedAt = new Date().toISOString()
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const doc = await req.payload.findByID({
          collection: 'posts',
          id,
          overrideAccess: true,
          req,
        })
        if (doc._status === 'published' && !hasPermission(req.user, 'publish'))
          throw new APIError(
            'Você não tem permissão para retirar um artigo publicado.',
            403,
          )
      },
    ],
    afterChange: [revalidatePost, auditCollection],
    afterDelete: [revalidateDelete],
    afterRead: [
      async ({ doc, req }) => {
        // campos calculados para o site: HTML do texto, tempo de leitura e nome do autor
        doc.contentHtml = postHtml(doc.content)
        doc.readingMinutes = readingMinutes(doc.contentHtml)
        const id =
          doc.author && typeof doc.author === 'object'
            ? doc.author.id
            : doc.author
        if (id) {
          try {
            doc.authorName = (
              await req.payload.findByID({
                collection: 'users',
                id,
                depth: 0,
                overrideAccess: true,
                select: { name: true },
                req,
              })
            ).name
          } catch {
            doc.authorName = ''
          }
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'title', label: 'Título', type: 'text', required: true },
    {
      name: 'excerpt',
      label: 'Resumo',
      type: 'textarea',
      maxLength: 200,
      admin: {
        description:
          'Até 200 caracteres. Aparece na lista do blog e no Google.',
      },
    },
    {
      name: 'cover',
      label: 'Imagem de capa',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'content',
      label: 'Texto',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          LinkFeature({ enabledCollections: ['posts'] }),
          UploadFeature({ enabledCollections: ['media'] }),
        ],
      }),
    },
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
          'Parte final do link do post. Se ficar vazio, é criado a partir do título.',
      },
    },
    {
      name: 'categories',
      label: 'Categorias',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      label: 'Autor',
      type: 'relationship',
      relationTo: 'users',
      defaultValue: ({ user }) => user?.id,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      label: 'Data de publicação',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Preenchida sozinha na primeira publicação.',
      },
    },
    {
      name: 'contentHtml',
      type: 'textarea',
      virtual: true,
      admin: { hidden: true },
    },
    {
      name: 'readingMinutes',
      type: 'number',
      virtual: true,
      admin: { hidden: true },
    },
    {
      name: 'authorName',
      type: 'text',
      virtual: true,
      admin: { hidden: true },
    },
  ],
}
