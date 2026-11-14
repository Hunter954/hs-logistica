// Marca, cores, contato e rodapé: o que vale para o site inteiro.
import type { GlobalConfig } from 'payload'
import { anyone, can } from '../lib/access'
import { auditGlobal } from '../hooks/audit'
import { contentConflict } from '../hooks/contentConflict'
import { revalidateGlobal } from '../hooks/revalidate'

const hex = (v: unknown): true | string =>
  typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
    ? true
    : 'Use uma cor no formato #RRGGBB, por exemplo #0E234E.'
const color = (name: string, label: string, def: string) => ({
  name,
  label,
  type: 'text' as const,
  required: true,
  defaultValue: def,
  validate: hex,
  admin: { width: '33%' },
})

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Marca, cores e contato',
  admin: { group: 'Site' },
  access: { read: anyone, update: can('brand') },
  hooks: {
    beforeChange: [contentConflict],
    afterChange: [revalidateGlobal, auditGlobal],
  },
  fields: [
    {
      name: 'expectedUpdatedAt',
      type: 'text',
      virtual: true,
      admin: { hidden: true },
    },
    {
      type: 'tabs',
      tabs: [
        {
          name: 'brand',
          label: 'Marca',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'name', label: 'Nome', type: 'text', required: true },
                { name: 'tag', label: 'Complemento do nome', type: 'text' },
              ],
            },
            {
              name: 'logo',
              label: 'Logo',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Sem logo enviado, o site usa o logo padrão da HS.',
              },
            },
            {
              name: 'logoWidth',
              label: 'Largura da logo no cabeçalho (px)',
              type: 'number',
              min: 40,
              max: 180,
              defaultValue: 77,
            },
            {
              name: 'showName',
              label: 'Mostrar nome ao lado da logomarca',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
        {
          name: 'navigation',
          label: 'Cabeçalho e menu',
          fields: [
            {
              name: 'configured',
              type: 'checkbox',
              defaultValue: false,
              admin: { hidden: true },
            },
            {
              name: 'cta',
              label: 'Botão do cabeçalho',
              type: 'text',
              defaultValue: 'Pedir cotação',
            },
            {
              name: 'items',
              label: 'Itens do menu (arraste para ordenar)',
              type: 'array',
              maxRows: 7,
              fields: [
                {
                  name: 'label',
                  label: 'Texto',
                  type: 'text',
                  required: true,
                  maxLength: 32,
                },
                {
                  name: 'target',
                  label: 'Destino',
                  type: 'select',
                  required: true,
                  options: [
                    { label: 'Serviços', value: 'servicos' },
                    { label: 'Localização', value: 'localizacao' },
                    { label: 'Etapas', value: 'etapas' },
                    { label: 'Empresa', value: 'empresa' },
                    { label: 'Blog', value: 'blog' },
                    { label: 'Dúvidas', value: 'duvidas' },
                    { label: 'Cotação', value: 'contato' },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'theme',
          label: 'Cores',
          description: 'Mudam no site inteiro, inclusive na cena 3D.',
          fields: [
            {
              type: 'row',
              fields: [
                color('accent', 'Verde de destaque', '#67AA4B'),
                color('ink', 'Azul da marca', '#0E234E'),
                color('paper', 'Cor clara (textos e formulário)', '#FFFFFF'),
              ],
            },
          ],
        },
        {
          name: 'contact',
          label: 'Contato',
          fields: [
            { name: 'address', label: 'Endereço', type: 'text' },
            {
              type: 'row',
              fields: [
                { name: 'phone', label: 'Telefone', type: 'text' },
                { name: 'whatsapp', label: 'WhatsApp (com DDD)', type: 'text' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'email', label: 'E-mail', type: 'email' },
                {
                  name: 'hours',
                  label: 'Horário de atendimento',
                  type: 'text',
                },
              ],
            },
          ],
        },
        {
          label: 'Rodapé',
          fields: [
            { name: 'footer', label: 'Texto do rodapé', type: 'text' },
            {
              name: 'footerOptions',
              label: 'Acesso ao painel',
              type: 'group',
              fields: [
                {
                  name: 'showAdminLink',
                  label: 'Exibir link do painel no rodapé',
                  type: 'checkbox',
                  defaultValue: true,
                },
                {
                  name: 'adminLabel',
                  label: 'Texto do link do painel',
                  type: 'text',
                  defaultValue: 'Área do cliente',
                },
              ],
            },
          ],
        },
        {
          name: 'seo',
          label: 'Google e redes sociais',
          description:
            'Valores padrão, usados quando uma página não tem os seus.',
          fields: [
            { name: 'title', label: 'Título', type: 'text' },
            {
              name: 'description',
              label: 'Descrição',
              type: 'textarea',
              maxLength: 200,
            },
            {
              name: 'image',
              label: 'Imagem de compartilhamento',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
      ],
    },
  ],
}
