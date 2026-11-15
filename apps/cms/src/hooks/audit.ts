import type {
  CollectionAfterChangeHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'
export async function audit(
  req: PayloadRequest,
  area: string,
  action: string,
  target: string,
  summary: string,
) {
  if (!req.user || req.context.skipAudit) return
  await req.payload.create({
    collection: 'activity',
    data: { actor: req.user.id, area, action, target, summary },
    overrideAccess: true,
    req,
    context: { skipAudit: true },
  })
}
export const auditCollection: CollectionAfterChangeHook = async ({
  doc,
  collection,
  operation,
  req,
}) => {
  await audit(
    req,
    collection.slug,
    operation,
    String(doc.id),
    `${operation === 'create' ? 'Criou' : 'Atualizou'} ${String(doc.title || doc.name || doc.alt || doc.id).slice(0, 150)}`,
  )
  return doc
}
export const auditGlobal: GlobalAfterChangeHook = async ({
  doc,
  global,
  req,
}) => {
  await audit(
    req,
    global.slug,
    'update',
    global.slug,
    `Salvou ${global.slug === 'home' ? 'a página inicial' : 'a identidade e configurações do site'}`,
  )
  return doc
}
