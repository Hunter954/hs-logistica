import { APIError, type GlobalBeforeChangeHook } from 'payload'
export const contentConflict: GlobalBeforeChangeHook = ({
  data,
  originalDoc,
}) => {
  if (
    data.expectedUpdatedAt &&
    originalDoc?.updatedAt &&
    data.expectedUpdatedAt !== originalDoc.updatedAt
  )
    throw new APIError(
      'Outra pessoa atualizou esta área. Recarregue a página antes de salvar para não substituir mudanças recentes.',
      409,
    )
  delete data.expectedUpdatedAt
  return data
}
