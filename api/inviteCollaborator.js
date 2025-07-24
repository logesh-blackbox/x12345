import supabase from './supabaseClient.js';
import { sendEmail } from './sendEmail.js';
import { randomBytes } from 'crypto';

export default async (req, res) => {
  try {
    // Get user from JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }

    const { noteId } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: email, role' 
      });
    }

    if (!['view', 'comment', 'edit'].includes(role)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid role. Must be one of: view, comment, edit' 
      });
    }

    // Check if user owns the note or has edit permissions
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('owner_uid, title')
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      return res.status(404).json({ ok: false, error: 'Note not found' });
    }

    // Check if user has permission to share this note
    if (note.owner_uid !== user.id) {
      const { data: permission } = await supabase
        .from('note_permissions')
        .select('can_edit')
        .eq('note_id', noteId)
        .eq('collaborator_uid', user.id)
        .single();

      if (!permission?.can_edit) {
        return res.status(403).json({ 
          ok: false, 
          error: 'You do not have permission to share this note' 
        });
      }
    }

    // Check if invitation already exists for this email and note
    const { data: existingInvitation } = await supabase
      .from('share_invitations')
      .select('id, status')
      .eq('note_id', noteId)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return res.status(409).json({ 
        ok: false, 
        error: 'Invitation already sent to this email for this note' 
      });
    }

    // Generate invitation token
    const invitationToken = randomBytes(32).toString('hex');

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('share_invitations')
      .insert({
        note_id: noteId,
        email: email,
        role: role,
        invited_by_uid: user.id,
        token: invitationToken,
        status: 'pending'
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to create invitation' 
      });
    }

    // Send invitation email
    const invitationLink = `${process.env.APP_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`;
    
    const emailResult = await sendEmail('invite', email, {
      inviter: user.email,
      link: invitationLink,
      noteTitle: note.title || 'Untitled Note'
    });

    if (!emailResult.success) {
      console.error('Failed to send invitation email:', emailResult.error);
      // Don't fail the request if email fails, but log it
    }

    res.status(201).json({
      ok: true,
      data: {
        invitationId: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        emailSent: emailResult.success
      }
    });

  } catch (error) {
    console.error('Error inviting collaborator:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
