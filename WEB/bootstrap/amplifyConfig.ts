import { Amplify, ResourcesConfig } from 'aws-amplify'

const awsRegion = import.meta.env.VITE_AWS_REGION
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID
const identityPoolId = import.meta.env.VITE_COGNITO_IDENTITY_POOL_ID
const apiUrl = import.meta.env.VITE_AMPLIFY_API_URL
const apiId = import.meta.env.VITE_AMPLIFY_API_ID

const config: ResourcesConfig = {
  Auth: {
    Cognito: {
      region: awsRegion,
      userPoolId,
      userPoolClientId,
      identityPoolId,
      loginWith: {
        username: true,
        email: true,
        phone: false
      }
    }
  },
  API: {
    GraphQL: {
      endpoint: apiUrl,
      region: awsRegion,
      defaultAuthMode: 'userPool'
    }
  },
  Storage: {
    S3: {
      bucket: import.meta.env.VITE_AMPLIFY_STORAGE_BUCKET,
      region: awsRegion,
      dangerouslyConnectToHttpEndpointForTesting: import.meta.env.DEV ? true : undefined
    }
  }
}

export function configureAmplify() {
  Amplify.configure(config, { ssr: false })
}

export type AmplifyEnv = {
  region: string
  apiUrl: string
  apiId: string
  storageBucket: string
}

export const amplifyEnv: AmplifyEnv = {
  region: awsRegion,
  apiUrl,
  apiId,
  storageBucket: import.meta.env.VITE_AMPLIFY_STORAGE_BUCKET
}


