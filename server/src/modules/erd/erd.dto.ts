import { z } from 'zod'

export const erdSyncSchema = z.object({
  connectionId: z.string().optional(),
})

export type ErdSyncDto = z.infer<typeof erdSyncSchema>
