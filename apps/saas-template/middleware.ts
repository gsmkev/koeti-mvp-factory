import { createAuthMiddleware } from '@koeti/auth'
import type { NextRequest } from 'next/server'
import type { NextResponse } from 'next/server'

const _auth = createAuthMiddleware({ protectedRoutes: ['/dashboard'] })

export const middleware: (req: NextRequest) => Promise<NextResponse | Response> = _auth.middleware
export const config = _auth.config
