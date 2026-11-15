import type { Payload } from 'payload'
export async function workspaceDefaults(payload: Payload) {
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  if (!settings.navigation?.configured)
    await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        navigation: {
          configured: true,
          cta: settings.navigation?.cta || 'Pedir cotação',
          items: settings.navigation?.items?.length
            ? settings.navigation.items
            : [
                { label: 'Serviços', target: 'servicos' },
                { label: 'Localização', target: 'localizacao' },
                { label: 'Empresa', target: 'empresa' },
                { label: 'Blog', target: 'blog' },
                { label: 'Dúvidas', target: 'duvidas' },
              ],
        },
      },
    })
}
