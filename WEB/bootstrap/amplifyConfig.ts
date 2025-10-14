import { Amplify } from 'aws-amplify'

const rawEnv = ((import.meta as any)?.env ?? {}) as Record<string, string | undefined>

export const amplifyEnv = {
  region: rawEnv.VITE_AMPLIFY_REGION,
  userPoolId: rawEnv.VITE_AMPLIFY_USER_POOL_ID,
  userPoolClientId: rawEnv.VITE_AMPLIFY_USER_POOL_CLIENT_ID,
  identityPoolId: rawEnv.VITE_AMPLIFY_IDENTITY_POOL_ID,
  apiUrl: rawEnv.VITE_AMPLIFY_API_URL,
}

export function configureAmplify() {
  const authConfig: any = {
    Cognito: {
      loginWith: { email: true },
    },
  }

  if (amplifyEnv.region) authConfig.Cognito.region = amplifyEnv.region
  if (amplifyEnv.userPoolId) authConfig.Cognito.userPoolId = amplifyEnv.userPoolId
  if (amplifyEnv.userPoolClientId) authConfig.Cognito.userPoolClientId = amplifyEnv.userPoolClientId
  if (amplifyEnv.identityPoolId) authConfig.Cognito.identityPoolId = amplifyEnv.identityPoolId

  const config: any = { Auth: authConfig }

  if (amplifyEnv.apiUrl) {
    config.API = {
      REST: {
        web: {
          endpoint: amplifyEnv.apiUrl,
        },
      },
    }
  }

  Amplify.configure(config)
}


