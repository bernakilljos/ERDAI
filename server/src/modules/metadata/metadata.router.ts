import { Router } from 'express'
import { handleExtractMetadata } from './metadata.controller'

const router = Router()

router.post('/extract', handleExtractMetadata)

export default router
