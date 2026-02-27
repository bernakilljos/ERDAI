import { Router } from 'express'
import {
  handleGetErd,
  handleSyncErd,
  handleExportDbml,
  handleExportMermaid,
} from './erd.controller'

const router = Router()

router.get('/:projectId', handleGetErd)
router.post('/:projectId/sync', handleSyncErd)
router.get('/:projectId/export/dbml', handleExportDbml)
router.get('/:projectId/export/mermaid', handleExportMermaid)

export default router
