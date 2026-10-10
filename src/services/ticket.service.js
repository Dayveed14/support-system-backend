import pool from '../config/database.js';
import ApiError from '../utils/ApiError.js';

const mapTicket = (row) => ({
  id: row.ticket_number,
  dbId: Number(row.id),
  title: row.title,
  description: row.description,
  category: row.category,
  priority: row.priority,
  status: row.status,
  customerId: Number(row.customer_id),
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  assignedAgentId: row.assigned_agent_id == null ? null : Number(row.assigned_agent_id),
  assignedAgentName: row.assigned_agent_name || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  thread: [{
    id: `initial-${row.id}`,
    authorId: Number(row.customer_id),
    authorName: row.customer_name,
    role: 'customer',
    message: row.description,
    timestamp: row.created_at,
  }],
});

export async function listTickets(user) {
  let sql = `
    SELECT t.id, CONCAT('TKT-', LPAD(t.id, 5, '0')) AS ticket_number,
      t.title, t.description, t.category, t.priority, t.status,
      t.customer_id, u.name AS customer_name, u.email AS customer_email,
      t.assigned_agent_id, a.name AS assigned_agent_name,
      t.created_at, t.updated_at
    FROM tickets t
    JOIN users u ON u.id = t.customer_id
    LEFT JOIN users a ON a.id = t.assigned_agent_id
  `;
  const params = [];
  if (user.role === 'customer') {
    sql += ' WHERE t.customer_id = ?';
    params.push(user.id);
  } else if (user.role === 'agent') {
    sql += ' WHERE t.assigned_agent_id = ? OR t.assigned_agent_id IS NULL';
    params.push(user.id);
  }
  sql += ' ORDER BY t.updated_at DESC';
  const [rows] = await pool.execute(sql, params);
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(',');
  const [replies] = await pool.execute(`
    SELECT r.id, r.ticket_id, r.user_id, u.name AS author_name, u.role AS author_role,
      r.message, r.created_at
    FROM ticket_replies r JOIN users u ON u.id = r.user_id
    WHERE r.ticket_id IN (${placeholders}) ORDER BY r.created_at ASC, r.id ASC
  `, ids);
  const replyMap = new Map();
  for (const reply of replies) {
    const key = Number(reply.ticket_id);
    if (!replyMap.has(key)) replyMap.set(key, []);
    replyMap.get(key).push({
      id: Number(reply.id), authorId: Number(reply.user_id), authorName: reply.author_name,
      role: reply.author_role, message: reply.message, timestamp: reply.created_at,
    });
  }
  return rows.map((row) => {
    const ticket = mapTicket(row);
    ticket.thread = [...ticket.thread, ...(replyMap.get(Number(row.id)) || [])];
    return ticket;
  });
}

export async function createTicket({ title, description, category, priority }, user) {
  if (user.role !== 'customer') throw new ApiError(403, 'Only customer accounts can submit support tickets.');
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const cleanDescription = typeof description === 'string' ? description.trim() : '';
  const cleanCategory = typeof category === 'string' ? category.trim() : '';
  const allowedCategories = ['Login Issue', 'Payment Issue', 'Technical Error', 'Account Management', 'Billing', 'Feature Request', 'Other'];
  const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
  if (cleanTitle.length < 4 || cleanTitle.length > 180) throw new ApiError(400, 'Title must be between 4 and 180 characters.');
  if (cleanDescription.length < 10 || cleanDescription.length > 10000) throw new ApiError(400, 'Description must be between 10 and 10,000 characters.');
  if (!allowedCategories.includes(cleanCategory)) throw new ApiError(400, 'Choose a valid ticket category.');
  if (!allowedPriorities.includes(priority)) throw new ApiError(400, 'Choose a valid ticket priority.');

  const [result] = await pool.execute(
    'INSERT INTO tickets (customer_id, title, description, category, priority, status) VALUES (?, ?, ?, ?, ?, ?)',
    [user.id, cleanTitle, cleanDescription, cleanCategory, priority, 'Open'],
  );
  const [rows] = await pool.execute(`
    SELECT t.id, CONCAT('TKT-', LPAD(t.id, 5, '0')) AS ticket_number,
      t.title, t.description, t.category, t.priority, t.status,
      t.customer_id, u.name AS customer_name, u.email AS customer_email,
      t.assigned_agent_id, a.name AS assigned_agent_name,
      t.created_at, t.updated_at
    FROM tickets t JOIN users u ON u.id = t.customer_id
    LEFT JOIN users a ON a.id = t.assigned_agent_id
    WHERE t.id = ? LIMIT 1
  `, [result.insertId]);
  return mapTicket(rows[0]);
}


const allowedStatuses = ['Open', 'Pending', 'Resolved', 'Closed'];

async function getTicketRow(ticketId) {
  const numericId = Number(ticketId);
  if (!Number.isSafeInteger(numericId) || numericId < 1) throw new ApiError(400, 'Invalid ticket ID.');
  const [rows] = await pool.execute(
    'SELECT id, customer_id, assigned_agent_id, status FROM tickets WHERE id = ? LIMIT 1',
    [numericId],
  );
  if (!rows.length) throw new ApiError(404, 'Ticket not found.');
  return rows[0];
}

function assertCanAccess(ticket, user) {
  if (user.role === 'admin') return;
  if (user.role === 'customer' && Number(ticket.customer_id) === Number(user.id)) return;
  if (user.role === 'agent' && (ticket.assigned_agent_id == null || Number(ticket.assigned_agent_id) === Number(user.id))) return;
  throw new ApiError(403, 'You do not have permission to access this ticket.');
}

export async function addReply(ticketId, message, user) {
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  if (!cleanMessage || cleanMessage.length > 5000) throw new ApiError(400, 'Reply must be between 1 and 5,000 characters.');
  const ticket = await getTicketRow(ticketId);
  assertCanAccess(ticket, user);
  if (ticket.status === 'Closed') throw new ApiError(400, 'Closed tickets cannot receive replies.');
  const [result] = await pool.execute(
    'INSERT INTO ticket_replies (ticket_id, user_id, message) VALUES (?, ?, ?)',
    [Number(ticketId), user.id, cleanMessage],
  );
  await pool.execute('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [Number(ticketId)]);
  const [rows] = await pool.execute(`
    SELECT r.id, r.user_id, u.name AS author_name, u.role AS author_role, r.message, r.created_at
    FROM ticket_replies r JOIN users u ON u.id = r.user_id WHERE r.id = ? LIMIT 1
  `, [result.insertId]);
  const row = rows[0];
  return { id: Number(row.id), authorId: Number(row.user_id), authorName: row.author_name, role: row.author_role, message: row.message, timestamp: row.created_at };
}

export async function updateStatus(ticketId, status, user) {
  if (!allowedStatuses.includes(status)) throw new ApiError(400, 'Choose a valid ticket status.');
  if (!['admin', 'agent'].includes(user.role)) throw new ApiError(403, 'Only support staff can update ticket status.');
  const ticket = await getTicketRow(ticketId);
  assertCanAccess(ticket, user);
  await pool.execute('UPDATE tickets SET status = ? WHERE id = ?', [status, Number(ticketId)]);
  return { id: `TKT-${String(ticketId).padStart(5, '0')}`, status };
}

export async function assignAgent(ticketId, agentId, user) {
  if (user.role !== 'admin') throw new ApiError(403, 'Only administrators can assign tickets.');
  const ticket = await getTicketRow(ticketId);
  let assignedId = null;
  if (agentId !== null && agentId !== '' && agentId !== undefined) {
    assignedId = Number(agentId);
    if (!Number.isSafeInteger(assignedId) || assignedId < 1) throw new ApiError(400, 'Choose a valid agent.');
    const [agents] = await pool.execute("SELECT id FROM users WHERE id = ? AND role = 'agent' LIMIT 1", [assignedId]);
    if (!agents.length) throw new ApiError(400, 'The selected user is not an active support agent.');
  }
  await pool.execute('UPDATE tickets SET assigned_agent_id = ? WHERE id = ?', [assignedId, Number(ticketId)]);
  return { id: `TKT-${String(ticketId).padStart(5, '0')}`, assignedAgentId: assignedId };
}

export async function listAgents(user) {
  if (!['admin', 'agent'].includes(user.role)) throw new ApiError(403, 'Only support staff can view the agent directory.');
  const [rows] = await pool.execute(
    "SELECT id, name, email FROM users WHERE role = 'agent' ORDER BY name ASC",
  );
  return rows.map((row) => ({ id: Number(row.id), name: row.name, email: row.email }));
}
