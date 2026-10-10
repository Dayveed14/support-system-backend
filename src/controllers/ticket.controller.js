import * as ticketService from '../services/ticket.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const tickets = await ticketService.listTickets(req.user);
  res.status(200).json({ success: true, data: { tickets } });
});

export const create = asyncHandler(async (req, res) => {
  const ticket = await ticketService.createTicket(req.body || {}, req.user);
  res.status(201).json({ success: true, message: 'Ticket created successfully.', data: { ticket } });
});

export const agents = asyncHandler(async (req, res) => {
  const agents = await ticketService.listAgents(req.user);
  res.status(200).json({ success: true, data: { agents } });
});

export const reply = asyncHandler(async (req, res) => {
  const reply = await ticketService.addReply(req.params.ticketId, req.body?.message, req.user);
  res.status(201).json({ success: true, message: 'Reply added successfully.', data: { reply } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateStatus(req.params.ticketId, req.body?.status, req.user);
  res.status(200).json({ success: true, message: 'Ticket status updated.', data: { ticket } });
});

export const assign = asyncHandler(async (req, res) => {
  const ticket = await ticketService.assignAgent(req.params.ticketId, req.body?.agentId ?? null, req.user);
  res.status(200).json({ success: true, message: 'Ticket assignment updated.', data: { ticket } });
});
