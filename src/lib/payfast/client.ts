import crypto from 'crypto'

export interface PayFastPaymentData {
  merchant_id: string
  merchant_key: string
  amount: number
  item_name: string
  return_url: string
  cancel_url: string
  notify_url: string
  email_address?: string
  name_first?: string
  name_last?: string
  passphrase?: string
}

export function generatePayFastSignature(data: PayFastPaymentData): string {
  // Create a copy of data
  const signatureData = { ...data }

  // Sort parameters alphabetically
  const sortedParams = Object.keys(signatureData)
    .sort()
    .filter((key) => signatureData[key as keyof PayFastPaymentData] !== undefined && signatureData[key as keyof PayFastPaymentData] !== '')
    .map((key) => `${key}=${encodeURIComponent(signatureData[key as keyof PayFastPaymentData] as string)}`)
    .join('&')

  // Generate MD5 hash
  return crypto.createHash('md5').update(sortedParams).digest('hex')
}

export function verifyPayFastSignature(data: any, passphrase?: string): boolean {
  const signature = data.signature
  delete data.signature

  const sortedParams = Object.keys(data)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(data[key])}`)
    .join('&')

  const paramString = passphrase ? `${sortedParams}&passphrase=${encodeURIComponent(passphrase)}` : sortedParams
  const calculatedSignature = crypto.createHash('md5').update(paramString).digest('hex')

  return signature === calculatedSignature
}

export function createPayFastPaymentUrl(data: PayFastPaymentData, signature: string): string {
  const baseUrl = 'https://www.payfast.co.za/eng/process'
  const params = new URLSearchParams({
    ...data,
    signature,
  } as any)

  return `${baseUrl}?${params.toString()}`
}
