export const handler = async (event: { secret: string }) => {
  // Placeholder: valida a master secret em Secrets Manager, se necessário
  if (!event.secret) return { success: false, error: 'SECRET_REQUIRED' }
  return { success: true }
}

