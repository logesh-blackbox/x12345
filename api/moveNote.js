import supabase from './supabaseClient.js';

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
    const { folderId } = req.body;

    if (!noteId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Note ID is required' 
      });
    }

    // Check if note exists and user has permission to move it
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('owner_uid, title, folder_id')
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      return res.status(404).json({ ok: false, error: 'Note not found' });
    }

    // Check if user owns the note or has edit permissions
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
          error: 'You do not have permission to move this note' 
        });
      }
    }

    // If folderId is provided, verify the folder exists and user owns it
    if (folderId) {
      const { data: folder, error: folderError } = await supabase
        .from('folders')
        .select('owner_uid, name')
        .eq('id', folderId)
        .single();

      if (folderError || !folder) {
        return res.status(404).json({ ok: false, error: 'Folder not found' });
      }

      if (folder.owner_uid !== user.id) {
        return res.status(403).json({ 
          ok: false, 
          error: 'You do not have permission to move note to this folder' 
        });
      }
    }

    // Update the note's folder
    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update({ 
        folder_id: folderId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select('id, title, folder_id, updated_at')
      .single();

    if (updateError) {
      console.error('Error moving note:', updateError);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to move note' 
      });
    }

    // Get folder name if note was moved to a folder
    let folderName = null;
    if (updatedNote.folder_id) {
      const { data: folder } = await supabase
        .from('folders')
        .select('name')
        .eq('id', updatedNote.folder_id)
        .single();
      
      folderName = folder?.name;
    }

    res.status(200).json({
      ok: true,
      data: {
        noteId: updatedNote.id,
        title: updatedNote.title,
        folderId: updatedNote.folder_id,
        folderName: folderName,
        updatedAt: updatedNote.updated_at
      }
    });

  } catch (error) {
    console.error('Error moving note:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
