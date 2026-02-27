import type { Response } from 'express'

/**
 * 성공 응답
 * 프론트 request()가 body를 직접 T로 파싱하므로 data만 반환
 */
export function ok<T>(res: Response, data: T): void {
  res.json(data)
}

/**
 * 에러 응답
 * 프론트 request()가 body.message를 기본 메시지로 사용
 */
export function fail(
  res: Response,
  status: number,
  message: string,
  extra?: Record<string, unknown>,
): void {
  res.status(status).json({ message, ...extra })
}
