import { z } from 'zod'

/**
 * POST /connections/test 입력 스키마
 * 프론트의 connectionSchema(lib/connectionSchema.ts)와 동일한 규칙
 */
const baseConnectionSchema = z.object({
  dbType:      z.enum(['mysql', 'mssql', 'oracle'], {
    errorMap: () => ({ message: "dbType은 'mysql' | 'mssql' | 'oracle' 중 하나여야 합니다." }),
  }),
  host:        z.string().min(1, 'host가 필요합니다.'),
  port:        z.coerce
                 .number({ invalid_type_error: 'port는 숫자여야 합니다.' })
                 .int()
                 .min(1)
                 .max(65535, 'port는 1~65535 범위여야 합니다.'),
  database:    z.string().optional(),
  serviceName: z.string().optional(),
  sid:         z.string().optional(),
  username:    z.string().min(1, 'username이 필요합니다.'),
  password:    z.string().min(1, 'password가 필요합니다.'),
})

function dbTypeRefine(data: z.infer<typeof baseConnectionSchema>, ctx: z.RefinementCtx) {
  if (data.dbType === 'mysql' || data.dbType === 'mssql') {
    if (!data.database?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MySQL/MSSQL은 database 필드가 필요합니다.',
        path: ['database'],
      })
    }
  }
  if (data.dbType === 'oracle') {
    if (!data.serviceName?.trim() && !data.sid?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Oracle은 serviceName 또는 sid 중 하나가 필요합니다.',
        path: ['serviceName'],
      })
    }
  }
}

export const connectionTestSchema = baseConnectionSchema.superRefine(dbTypeRefine)

export const connectionCreateSchema = baseConnectionSchema
  .extend({
    projectId:      z.string().optional(),
    connectionName: z.string().optional(),
  })
  .superRefine(dbTypeRefine)

export const connectionUpdateSchema = z.object({
  connectionName: z.string().min(1, '연결 이름은 1자 이상이어야 합니다.'),
})

export type ConnectionTestDto = z.infer<typeof connectionTestSchema>
export type ConnectionCreateDto = z.infer<typeof connectionCreateSchema>
export type ConnectionUpdateDto = z.infer<typeof connectionUpdateSchema>
