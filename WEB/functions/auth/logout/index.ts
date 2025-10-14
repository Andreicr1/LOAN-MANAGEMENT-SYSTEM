type Event = { userId?: string }

export const handler = async (_event: Event) => {
  // Para JWTs do Cognito, o "logout" é client-side (descartar tokens).
  // Opcionalmente, poderíamos invalidar refresh tokens via GlobalSignOut.
  return { success: true }
}

