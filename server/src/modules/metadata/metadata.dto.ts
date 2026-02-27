import { z } from 'zod'

export const metadataExtractSchema = z.object({
  connectionId: z.string().min(1, 'connectionId가 필요합니다.'),
})

export type MetadataExtractDto = z.infer<typeof metadataExtractSchema>
