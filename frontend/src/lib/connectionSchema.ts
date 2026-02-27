import { z } from 'zod'

export const connectionSchema = z
  .object({
    dbType: z.enum(['mysql', 'mssql', 'oracle']),
    host: z.string().min(1, 'Host를 입력해주세요.'),
    port: z.coerce
      .number({ invalid_type_error: '숫자를 입력해주세요.' })
      .int()
      .min(1)
      .max(65535, '1~65535 범위로 입력해주세요.'),
    database:    z.string().optional(),
    serviceName: z.string().optional(),
    sid:         z.string().optional(),
    username: z.string().min(1, 'Username을 입력해주세요.'),
    password: z.string().min(1, 'Password를 입력해주세요.'),
  })
  .superRefine((data, ctx) => {
    if (data.dbType === 'mysql' || data.dbType === 'mssql') {
      if (!data.database?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Database를 입력해주세요.',
          path: ['database'],
        })
      }
    }
    if (data.dbType === 'oracle') {
      if (!data.serviceName?.trim() && !data.sid?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Service Name 또는 SID 중 하나를 입력해주세요.',
          path: ['serviceName'],
        })
      }
    }
  })

export type ConnectionFormValues = z.infer<typeof connectionSchema>

/** DB 종류별 기본 포트 (실제값: 민감정보 아님) */
export const DEFAULT_PORTS: Record<ConnectionFormValues['dbType'], number> = {
  mysql:  3306,
  mssql:  1433,
  oracle: 1521,
}
