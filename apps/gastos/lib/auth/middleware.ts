import { z } from 'zod'
import type { TeamDataWithMembers, User } from '@koeti/db'
import { getTeamForUser, getUser } from '@/lib/db/queries'
import { redirect } from 'next/navigation'
import { validatedAction } from '@koeti/auth'

export type { ActionState } from '@koeti/auth'
export { validatedAction }

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User
) => Promise<T>

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: any, formData: FormData) => {
    const user = await getUser()
    if (!user) throw new Error('User is not authenticated')
    const result = schema.safeParse(Object.fromEntries(formData))
    if (!result.success) return { error: result.error.errors[0].message }
    return action(result.data, formData, user)
  }
}

type ActionWithTeamFunction<T> = (formData: FormData, team: TeamDataWithMembers) => Promise<T>

export function withTeam<T>(action: ActionWithTeamFunction<T>) {
  return async (formData: FormData): Promise<T> => {
    const user = await getUser()
    if (!user) redirect('/sign-in')
    const team = await getTeamForUser()
    if (!team) throw new Error('Team not found')
    return action(formData, team)
  }
}
