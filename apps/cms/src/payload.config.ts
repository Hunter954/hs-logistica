import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { buildConfig, type Plugin } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { s3Storage } from '@payloadcms/storage-s3'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { pt } from '@payloadcms/translations/languages/pt'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Categories } from './collections/Categories'
import { Quotes } from './collections/Quotes'
import { Activity } from './collections/Activity'
import { workspaceEndpoints } from './lib/workspaceEndpoints'
import { hasPermission } from './lib/permissions'
import { Home } from './globals/Home'
import { SiteSettings } from './globals/SiteSettings'
import { anyone, can } from './lib/access'
import { env } from './lib/env'
import { revalidateAlways, revalidateDelete } from './hooks/revalidate'
import { ensureAdmin } from './seed/ensureAdmin'
import { workspaceDefaults } from './seed/workspaceDefaults'
import { migrations } from './migrations'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const e = process.env

const plugins: Plugin[] = [
  seoPlugin({
    collections: ['posts'],
    globals: ['home'],
    uploadsCollection: 'media',
    tabbedUI: false,
    generateTitle: ({ doc }) =>
      `${(doc as { title?: string }).title || 'HS Logística e Armazenagem'} | HS Logística`,
    generateDescription: ({ doc }) =>
      (doc as { excerpt?: string }).excerpt || '',
  }),
  redirectsPlugin({
    collections: ['posts'],
    overrides: {
      labels: { singular: 'Redirecionamento', plural: 'Redirecionamentos' },
      admin: {
        components: { views: { list: { Component: '/components/workspace/Management#RedirectManager' } } },
        group: 'Configurações',
        hidden: ({ user }) => !hasPermission(user, 'brand'),
        description: 'Links antigos que devem levar a um endereço novo.',
      },
      access: {
        read: anyone,
        create: can('brand'),
        update: can('brand'),
        delete: can('brand'),
      },
      hooks: {
        afterChange: [revalidateAlways],
        afterDelete: [revalidateDelete],
      },
    },
  }),
]
// Mídia: bucket compatível com S3 (R2, Railway) quando configurado; sem ele, pasta local `media/` (desenvolvimento)
if (e.S3_BUCKET) {
  plugins.push(
    s3Storage({
      collections: {
        media: e.S3_PUBLIC_URL
          ? {
              generateFileURL: ({ filename, prefix }) =>
                [e.S3_PUBLIC_URL!.replace(/\/$/, ''), prefix, filename]
                  .filter(Boolean)
                  .join('/'),
            }
          : true,
      },
      bucket: e.S3_BUCKET,
      config: {
        endpoint: e.S3_ENDPOINT || undefined,
        region: e.S3_REGION || 'auto',
        forcePathStyle: true,
        credentials: {
          accessKeyId: e.S3_ACCESS_KEY_ID || '',
          secretAccessKey: e.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  )
}

export default buildConfig({
  serverURL: env.cmsUrl,
  secret: e.PAYLOAD_SECRET || '',
  cors: [env.siteUrl],
  csrf: [env.siteUrl, env.cmsUrl],
  admin: {
    theme: 'light',
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: ' · HS Logística',
      icons: [{ rel: 'icon', type: 'image/png', url: '/logo.png' }],
    },
    components: {
      graphics: {
        Logo: '/components/Brand#Logo',
        Icon: '/components/Brand#Icon',
      },
      beforeNavLinks: ['/components/AdminUI#NavBrand'],
      afterNavLinks: ['/components/AdminUI#NavFooter'],
      beforeLogin: ['/components/AdminUI#LoginIntro'],
      afterLogin: [{ path: '/components/AdminUI#LoginFooter', clientProps: { emailRecovery: !!e.SMTP_HOST } }],
      actions: [
        {
          path: '/components/AdminUI#HeaderAction',
          clientProps: { siteUrl: env.siteUrl },
        },
      ],
      views: {
        account: { Component: '/components/workspace/Account#Account' },
        dashboard: { Component: '/components/WorkspaceHome#WorkspaceHome' },
        inbox: {
          Component: '/components/WorkspaceViews#QuotesView',
          path: '/inbox',
        },
        team: {
          Component: '/components/WorkspaceViews#TeamView',
          path: '/team',
        },
        site: {
          Component: '/components/WorkspaceViews#SiteView',
          path: '/site',
        },
      },
    },
    livePreview: {
      breakpoints: [
        { label: 'Celular', name: 'mobile', width: 390, height: 844 },
        { label: 'Computador', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  i18n: { supportedLanguages: { pt }, fallbackLanguage: 'pt' },
  collections: [Posts, Categories, Quotes, Media, Users, Activity],
  endpoints: workspaceEndpoints,
  globals: [Home, SiteSettings],
  editor: lexicalEditor(),
  graphQL: { disable: true }, // o site usa só a API REST
  upload: { limits: { fileSize: 8 * 1024 * 1024 }, abortOnLimit: true },
  // sem SMTP configurado, o Payload só registra os e-mails no log
  email: e.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: e.SMTP_FROM || 'site@hslogistica.invalid',
        defaultFromName: 'Site HS Logística',
        transportOptions: {
          host: e.SMTP_HOST,
          port: Number(e.SMTP_PORT || 587),
          secure: Number(e.SMTP_PORT) === 465,
          auth: { user: e.SMTP_USER || '', pass: e.SMTP_PASS || '' },
        },
      })
    : undefined,
  // fila que publica os posts agendados; roda a cada minuto dentro do próprio serviço do CMS
  jobs: {
    autoRun: [{ cron: '* * * * *', queue: 'default', limit: 20 }],
    shouldAutoRun: () => true,
  },
  // os tipos gerados são compartilhados com o site; a declaração para o Payload fica em src/payload.d.ts
  typescript: {
    outputFile: path.resolve(
      dirname,
      '../../../packages/types/payload-types.ts',
    ),
    declare: false,
  },
  // em produção as migrações de src/migrations rodam sozinhas na partida; em desenvolvimento o esquema acompanha o código
  db: postgresAdapter({
    pool: { connectionString: e.DATABASE_URI || e.DATABASE_URL || '' },
    prodMigrations: migrations,
  }),
  sharp,
  plugins,
  onInit: async (payload) => {
    await ensureAdmin(payload)
    if (process.env.SKIP_WORKSPACE_DEFAULTS !== '1')
      await workspaceDefaults(payload)
  },
})
