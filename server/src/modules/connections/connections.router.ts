import { Router } from 'express'
import {
  handleTestConnection,
  handleCreateConnection,
  handleListConnections,
  handleDeleteConnection,
  handleUpdateConnection,
} from './connections.controller'

const router = Router()

// POST /connections/test
router.post('/test', handleTestConnection)

// POST /connections
router.post('/', handleCreateConnection)

// GET /connections
router.get('/', handleListConnections)

// PUT /connections/:id
router.put('/:id', handleUpdateConnection)

// DELETE /connections/:id
router.delete('/:id', handleDeleteConnection)

export default router
