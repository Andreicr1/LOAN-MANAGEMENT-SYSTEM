import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { Amplify } from 'aws-amplify'
import { signIn, fetchAuthSession } from 'aws-amplify/auth'
import { generateClient } from 'aws-amplify/data'

type Options = {
  sqlitePath: string
  graphQlUrl: string
  region: string
  userPoolId: string
  userPoolClientId: string
  identityPoolId: string
  username: string
  password: string
}

async function migrate(options: Options) {
  Amplify.configure({
    Auth: {
      Cognito: {
        region: options.region,
        userPoolId: options.userPoolId,
        userPoolClientId: options.userPoolClientId,
        identityPoolId: options.identityPoolId,
        loginWith: { username: true, email: true }
      }
    },
    API: {
      GraphQL: {
        endpoint: options.graphQlUrl,
        region: options.region,
        defaultAuthMode: 'userPool'
      }
    }
  })

  await signIn({ username: options.username, password: options.password })
  await fetchAuthSession()

  const client = generateClient({ authMode: 'userPool' })

  const db = await open({ filename: options.sqlitePath, driver: sqlite3.Database })
  const users = await db.all('SELECT * FROM users')
  for (const user of users) {
    await client.mutations.createUser({
      cognitoId: `legacy-${user.id}`,
      username: user.username,
      fullName: user.full_name,
      email: user.email ?? undefined,
      role: user.role.toUpperCase()
    })
  }

  const configs = await db.all('SELECT * FROM config LIMIT 1')
  if (configs[0]) {
    await client.mutations.createConfig({
      masterSecretRequired: true,
      email: {
        host: configs[0].email_host,
        port: configs[0].email_port,
        user: configs[0].email_user,
        passStored: !!configs[0].email_pass
      },
      signwell: {
        apiKeyStored: !!configs[0].signwell_api_key,
        webhookSecretStored: !!configs[0].signwell_secret_key
      }
    })
  }

  const disbursements = await db.all('SELECT * FROM disbursements')
  for (const disbursement of disbursements) {
    await client.mutations.createDisbursement({
      id: String(disbursement.id),
      clientId: String(disbursement.client_id),
      amount: disbursement.requested_amount,
      status: disbursement.status.toUpperCase(),
      approvedBy: disbursement.approved_by ? String(disbursement.approved_by) : undefined,
      approvedAt: disbursement.approved_at ?? undefined
    })
  }

  const promissoryNotes = await db.all('SELECT * FROM promissory_notes')
  for (const pn of promissoryNotes) {
    await client.mutations.createPromissoryNote({
      id: String(pn.id),
      disbursementId: String(pn.disbursement_id),
      pdfKey: pn.generated_pn_path ?? undefined,
      dueDate: pn.due_date,
      amount: pn.principal_amount
    })
  }

  await db.close()
}

if (require.main === module) {
  const sqlitePath = process.argv[2]
  if (!sqlitePath) {
    console.error('Usage: ts-node migrate-sqlite-to-amplify.ts <sqlitePath>')
    process.exit(1)
  }

  migrate({
    sqlitePath,
    graphQlUrl: process.env.AMPLIFY_API_URL!,
    region: process.env.AWS_REGION!,
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    userPoolClientId: process.env.COGNITO_USER_POOL_CLIENT_ID!,
    identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID!,
    username: process.env.MIGRATION_USERNAME!,
    password: process.env.MIGRATION_PASSWORD!
  }).catch((error) => {
    console.error(error)
    process.exit(1)
  })
}

