export type BucketDefinition = {
  nameEnv: string
  description: string
  access: {
    lambda: Array<'get' | 'put' | 'list' | 'delete'>
    publicRead?: boolean
  }
  lifecycleRules?: Array<{ prefix: string; expirationDays: number }>
}

export const storageBuckets: Record<'pdfDocuments' | 'exports' | 'uploads', BucketDefinition> = {
  pdfDocuments: {
    nameEnv: 'VITE_S3_PDF_BUCKET',
    description: 'Armazena PDFs gerados (Notas Promissórias, relatórios).',
    access: {
      lambda: ['get', 'put', 'list']
    }
  },
  exports: {
    nameEnv: 'VITE_S3_EXPORT_BUCKET',
    description: 'Backups e exports CSV gerados sob demanda.',
    access: {
      lambda: ['get', 'put', 'list', 'delete']
    },
    lifecycleRules: [
      { prefix: 'daily/', expirationDays: 30 },
      { prefix: 'manual/', expirationDays: 365 }
    ]
  },
  uploads: {
    nameEnv: 'VITE_S3_UPLOAD_BUCKET',
    description: 'Uploads temporários (ex.: CSV conciliação bancária).',
    access: {
      lambda: ['get', 'put', 'list', 'delete']
    },
    lifecycleRules: [{ prefix: 'tmp/', expirationDays: 7 }]
  }
}

export function resolveBucketName(key: keyof typeof storageBuckets) {
  const envName = storageBuckets[key].nameEnv
  const value = import.meta.env[envName]
  if (!value) {
    throw new Error(`Bucket ${key} não configurado. Defina ${envName}.`)
  }
  return value
}


