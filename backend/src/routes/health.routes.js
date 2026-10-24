import { Router } from 'express'
import { sendSuccess } from '../middleware/errorHandler.js'

const router = Router()

router.get('/', (req, res) => {
  sendSuccess(res, { status: 'ok', uptimeSec: process.uptime() })
})

export default router
