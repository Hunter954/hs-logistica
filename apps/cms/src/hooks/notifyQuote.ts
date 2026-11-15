// Pedido novo: avisa por e-mail e, se configurado, por webhook (n8n, WhatsApp).
import type { CollectionAfterChangeHook } from 'payload'
import { env } from '../lib/env'

const esc = (s: unknown): string =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  )

export const notifyQuote: CollectionAfterChangeHook = ({
  doc,
  operation,
  req,
  context,
}) => {
  if (operation !== 'create' || context?.imported) return doc // pedidos importados da v2 não disparam aviso
  const { payload } = req
  const link = `${env.cmsUrl}/admin/collections/quotes/${doc.id}`
  // nada disso segura a resposta ao visitante: falha de e-mail ou webhook só vai para o log
  if (env.quoteNotifyTo) {
    void payload
      .sendEmail({
        to: env.quoteNotifyTo,
        subject: `Novo pedido de cotação: ${doc.name}`,
        html: `<p><b>${esc(doc.name)}</b> pediu uma cotação.</p><p>Contato: ${esc(doc.contact)}<br>Serviço: ${esc(doc.service)}</p><p>${esc(doc.message).replace(/\n/g, '<br>')}</p><p><a href="${link}">Abrir no painel</a></p>`,
      })
      .catch((e: Error) =>
        payload.logger.warn('cotação: e-mail não enviado: ' + e.message),
      )
  }
  if (env.quoteWebhookUrl) {
    void fetch(env.quoteWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        id: doc.id,
        name: doc.name,
        contact: doc.contact,
        service: doc.service,
        message: doc.message,
        createdAt: doc.createdAt,
        adminUrl: link,
      }),
    })
      .then((r) => {
        if (!r.ok) payload.logger.warn('cotação: webhook respondeu ' + r.status)
      })
      .catch((e: Error) =>
        payload.logger.warn('cotação: webhook falhou: ' + e.message),
      )
  }
  return doc
}
