/**
 * Proxy for /v1/providers — returns available providers
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json([
    { provider: 'THORCHAIN', enabled: true },
    { provider: 'MAYACHAIN', enabled: true },
  ])
}
