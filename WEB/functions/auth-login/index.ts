import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'
import { createHmac } from 'crypto'

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION })

type Event = {
  username: string
  password: string
}

export const handler = async (event: Event) => {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID!,
    AuthParameters: {
      USERNAME: event.username,
      PASSWORD: event.password,
      SECRET_HASH: createSecretHash(event.username)
    }
  })

  const result = await client.send(command)

  return {
    success: true,
    tokens: result.AuthenticationResult
  }
}

function createSecretHash(username: string) {
  return createHmac('SHA256', process.env.COGNITO_CLIENT_SECRET!)
    .update(`${username}${process.env.COGNITO_CLIENT_ID}`)
    .digest('base64')
}

