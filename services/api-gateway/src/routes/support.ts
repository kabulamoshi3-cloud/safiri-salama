/**
 * Support System API Routes
 * Handles WhatsApp integration, live chat, and ticketing system
 */

import express, { Request, Response } from 'express';
import { database } from '../database';
import { authMiddleware as auth } from '../middleware/auth';
import axios from 'axios';

export const supportRouter = express.Router();

/**
 * Data Models
 */
interface SupportTicket {
  id: string;
  user_id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string;
  created_at: Date;
  resolved_at: Date;
}

interface ChatMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'agent';
  message: string;
  attachment_url: string;
  sent_at: Date;
}

/**
 * POST /api/v1/support/create-ticket
 * Create a new support ticket
 */
supportRouter.post('/create-ticket', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, description, category, priority = 'medium', trip_id } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        error: 'title, description, and category required'
      });
    }

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const result = await database.query(
      `INSERT INTO support_tickets 
       (user_id, ticket_number, title, description, category, priority, status, trip_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', $7, NOW())
       RETURNING id, ticket_number`,
      [userId, ticketNumber, title, description, category, priority, trip_id]
    );

    const ticket = result.rows[0];

    // Send confirmation via WhatsApp
    await sendWhatsAppMessage(req.user?.phone_number, 
      `Your support ticket #${ticket.ticket_number} has been created. We'll get back to you shortly. Reply to this chat for updates.`
    );

    return res.status(201).json({
      success: true,
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      message: 'Ticket created successfully. You will receive updates via WhatsApp.'
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/support/send-message
 * Send message in support chat
 */
supportRouter.post('/send-message', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ticket_id, message, attachment_url } = req.body;

    if (!ticket_id || !message) {
      return res.status(400).json({
        error: 'ticket_id and message required'
      });
    }

    // Verify ticket belongs to user
    const ticketResult = await database.query(
      `SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [ticket_id, userId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Save message
    const msgResult = await database.query(
      `INSERT INTO support_messages 
       (ticket_id, sender_id, sender_type, message, attachment_url, sent_at)
       VALUES ($1, $2, 'user', $3, $4, NOW())
       RETURNING id`,
      [ticket_id, userId, message, attachment_url]
    );

    // If ticket is unassigned, auto-assign to available agent
    if (!ticket.assigned_to) {
      const agentResult = await database.query(
        `SELECT id FROM support_agents 
         WHERE status = 'available' 
         ORDER BY RANDOM() LIMIT 1`
      );

      if (agentResult.rows.length > 0) {
        await database.query(
          `UPDATE support_tickets SET assigned_to = $1, status = 'in_progress' WHERE id = $2`,
          [agentResult.rows[0].id, ticket_id]
        );
      }
    }

    return res.status(200).json({
      success: true,
      message_id: msgResult.rows[0].id,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/support/tickets
 * Get user's support tickets
 */
supportRouter.get('/tickets', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const status = req.query.status as string | undefined;

    let query = `SELECT * FROM support_tickets WHERE user_id = $1`;
    const params = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await database.query(query, params);

    return res.status(200).json({
      tickets: result.rows.map(ticket => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at
      }))
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/support/tickets/:ticket_id/messages
 * Get messages for a ticket
 */
supportRouter.get('/tickets/:ticket_id/messages', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ticket_id } = req.params;

    // Verify ticket belongs to user
    const ticketResult = await database.query(
      `SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [ticket_id, userId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const result = await database.query(
      `SELECT * FROM support_messages 
       WHERE ticket_id = $1
       ORDER BY sent_at ASC`,
      [ticket_id]
    );

    return res.status(200).json({
      messages: result.rows.map(msg => ({
        id: msg.id,
        sender: msg.sender_type === 'user' ? 'You' : 'Support Team',
        message: msg.message,
        attachment: msg.attachment_url,
        sent_at: msg.sent_at
      }))
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/support/whatsapp-webhook
 * Receive WhatsApp messages from Twilio
 */
supportRouter.post('/whatsapp-webhook', async (req: Request, res: Response) => {
  try {
    const { From, Body, MediaUrl0 } = req.body;

    // Extract phone number
    const phoneNumber = From.replace('whatsapp:', '');

    // Find or create user by phone
    let userResult = await database.query(
      `SELECT id FROM users WHERE phone_number = $1`,
      [phoneNumber]
    );

    if (userResult.rows.length === 0) {
      // Send message asking to register
      await sendWhatsAppMessage(phoneNumber, 
        'Welcome to Safiri Haraka Support! Please register at https://app.safiriharaka.com to create a ticket.'
      );
      return res.status(200).json({ success: true });
    }

    const userId = userResult.rows[0].id;

    // Check if this is a reply to an existing ticket
    const ticketResult = await database.query(
      `SELECT id FROM support_tickets 
       WHERE user_id = $1 AND status != 'closed'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    let ticketId;
    if (ticketResult.rows.length === 0) {
      // Create new ticket
      const newTicketResult = await database.query(
        `INSERT INTO support_tickets 
         (user_id, ticket_number, title, description, category, priority, status, created_at)
         VALUES ($1, $2, 'WhatsApp Message', $3, 'general', 'medium', 'open', NOW())
         RETURNING id`,
        [userId, `TKT-WA-${Date.now()}`, Body]
      );
      ticketId = newTicketResult.rows[0].id;
    } else {
      ticketId = ticketResult.rows[0].id;
    }

    // Save message
    await database.query(
      `INSERT INTO support_messages 
       (ticket_id, sender_id, sender_type, message, attachment_url, sent_at)
       VALUES ($1, $2, 'user', $3, $4, NOW())`,
      [ticketId, userId, Body, MediaUrl0]
    );

    // Send acknowledgement
    await sendWhatsAppMessage(phoneNumber, 
      'Thank you for your message. A support agent will respond shortly.'
    );

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error handling WhatsApp webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/support/resolve-ticket
 * Admin: Mark ticket as resolved
 */
supportRouter.post('/resolve-ticket', auth, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'support_agent' && req.user?.type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { ticket_id, resolution_message } = req.body;

    // Get ticket and user info
    const ticketResult = await database.query(
      `SELECT st.*, u.phone_number FROM support_tickets st
       JOIN users u ON st.user_id = u.id
       WHERE st.id = $1`,
      [ticket_id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Update ticket
    await database.query(
      `UPDATE support_tickets 
       SET status = 'resolved', resolved_at = NOW()
       WHERE id = $1`,
      [ticket_id]
    );

    // Save resolution message
    if (resolution_message) {
      await database.query(
        `INSERT INTO support_messages 
         (ticket_id, sender_id, sender_type, message, sent_at)
         VALUES ($1, $2, 'agent', $3, NOW())`,
        [ticket_id, req.user?.id, resolution_message]
      );
    }

    // Notify user via WhatsApp
    await sendWhatsAppMessage(ticket.phone_number,
      `Your support ticket #${ticket.ticket_number} has been resolved. ${resolution_message || 'Thank you for contacting Safiri Haraka Support!'}`
    );

    return res.status(200).json({
      success: true,
      message: 'Ticket resolved and user notified'
    });

  } catch (error) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/support/stats (Admin)
 * Get support statistics
 */
supportRouter.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin' && req.user?.type !== 'support_agent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await database.query(
      `SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
       FROM support_tickets
       WHERE created_at >= NOW() - INTERVAL '30 days'`
    );

    const stats = result.rows[0];

    return res.status(200).json({
      total_tickets: stats.total_tickets || 0,
      open_tickets: stats.open_tickets || 0,
      in_progress: stats.in_progress || 0,
      resolved: stats.resolved || 0,
      avg_resolution_hours: stats.avg_resolution_hours ? parseFloat(stats.avg_resolution_hours).toFixed(1) : 'N/A'
    });

  } catch (error) {
    console.error('Error fetching support stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper: Send WhatsApp message via Twilio
 */
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<void> {
  try {
    // TODO: Integrate with Twilio WhatsApp API
    // Placeholder implementation
    console.log(`[WhatsApp] To: ${phoneNumber}, Message: ${message}`);
    
    // Example Twilio integration:
    // await axios.post(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, 
    //   {
    //     From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
    //     To: `whatsapp:${phoneNumber}`,
    //     Body: message
    //   },
    //   {
    //     auth: {
    //       username: TWILIO_ACCOUNT_SID,
    //       password: TWILIO_AUTH_TOKEN
    //     }
    //   }
    // );
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

export default supportRouter;
