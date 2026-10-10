import { Router } from 'express';
import * as ticketController from '../controllers/ticket.controller.js';

const router = Router();
router.get('/agents', ticketController.agents);
router.get('/', ticketController.list);
router.post('/', ticketController.create);
router.post('/:ticketId/replies', ticketController.reply);
router.patch('/:ticketId/status', ticketController.updateStatus);
router.patch('/:ticketId/assignment', ticketController.assign);
export default router;
