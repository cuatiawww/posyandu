import { NextRequest, NextResponse } from 'next/server'

function getCorsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  }
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders })
  }

  const { path } = await params
  const pathStr = path.join('/')

  console.log(`[Offline Backend Mock Proxy] Intercepted request to: ${pathStr}`)

  return NextResponse.json({
    success: true,
    message: `Aplikasi berjalan dalam mode offline/statis. Endpoint backend "${pathStr}" berhasil disimulasikan.`,
    data: []
  }, {
    status: 200,
    headers: corsHeaders
  })
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
export const OPTIONS = handler
