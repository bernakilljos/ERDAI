import { Router } from 'express'
import {
  handleListProjects,
  handleCreateProject,
  handleGetProject,
  handleUpdateProject,
  handleResetProject,
} from './projects.controller'

const router = Router()

router.get('/', handleListProjects)
router.post('/', handleCreateProject)
router.get('/:projectId', handleGetProject)
router.put('/:projectId', handleUpdateProject)
router.post('/:projectId/reset', handleResetProject)

export default router
