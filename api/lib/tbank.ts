import crypto from 'crypto'

const TBANK_URL = 'https://securepay.tinkoff.ru/v2'

// ─── Token generation ─────────────────────────────────────

export function generateToken(
  params: Record<string, string | number | boolean | undefined>,
  password: string,
): string {
  // Add password, remove undefined/object values
  const allParams: Record<string, string | number | boolean> = {
    ...params,
    Password: password,
  }

  // Only include scalar values (no nested objects like Receipt, DATA)
  const flat = Object.entries(allParams)
    .filter(([, v]) => v !== undefined && typeof v !== 'object')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => String(v))

  const str = flat.join('')
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex')
}

// ─── Init payment ─────────────────────────────────────────

export interface TBankInitRequest {
  Amount: number            // kopecks
  OrderId: string
  Description?: string
  CustomerKey?: string
  NotificationURL?: string
  SuccessURL?: string
  FailURL?: string
}

export interface TBankInitResponse {
  Success: boolean
  ErrorCode: string
  TerminalKey: string
  Status: string
  PaymentId: string
  OrderId: string
  Amount: number
  PaymentURL: string
  Message?: string
  Details?: string
}

export async function initPayment(params: TBankInitRequest): Promise<TBankInitResponse> {
  const terminalKey = process.env.TBANK_TERMINAL_KEY
  const terminalPassword = process.env.TBANK_TERMINAL_PASSWORD
  if (!terminalKey || !terminalPassword) {
    throw new Error('T-Bank credentials not configured')
  }

  const requestBody: Record<string, string | number | boolean | undefined> = {
    TerminalKey: terminalKey,
    Amount: params.Amount,
    OrderId: params.OrderId,
    Description: params.Description,
    CustomerKey: params.CustomerKey,
    NotificationURL: params.NotificationURL,
    SuccessURL: params.SuccessURL,
    FailURL: params.FailURL,
  }

  requestBody.Token = generateToken(requestBody, terminalPassword)

  const response = await fetch(`${TBANK_URL}/Init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`T-Bank Init HTTP error: ${response.status}`)
  }

  const data = await response.json() as TBankInitResponse

  if (!data.Success || data.ErrorCode !== '0') {
    throw new Error(`T-Bank Init failed: ${data.Message ?? data.ErrorCode}`)
  }

  return data
}

// ─── Webhook verification ─────────────────────────────────

export function verifyWebhookToken(
  payload: Record<string, string | number | boolean | undefined>,
  receivedToken: string,
): boolean {
  const terminalPassword = process.env.TBANK_TERMINAL_PASSWORD
  if (!terminalPassword) return false

  const paramsWithoutToken = { ...payload }
  delete paramsWithoutToken.Token

  const expectedToken = generateToken(paramsWithoutToken, terminalPassword)
  return expectedToken === receivedToken
}
