import { z } from 'zod'

export const projectCreateSchema = z.object({
  projectName: z.string().min(1, '프로젝트명을 입력해주세요.'),
  description: z.string().optional(),
})

export const projectUpdateSchema = projectCreateSchema.partial()

export type ProjectCreateDto = z.infer<typeof projectCreateSchema>
export type ProjectUpdateDto = z.infer<typeof projectUpdateSchema>
