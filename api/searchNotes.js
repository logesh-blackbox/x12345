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

    const { query, limit = 20 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Search query is required' 
      });
    }

    const searchLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

    try {
      // Use Postgres full-text search
      // Search in notes that user owns or has access to
      const { data: searchResults, error: searchError } = await supabase
        .rpc('search_user_notes', {
          search_query: query,
          user_id: user.id,
          result_limit: searchLimit
        });

      if (searchError) {
        // If RPC function doesn't exist, fall back to basic search
        console.log('RPC function not found, using fallback search');
        
        const { data: fallbackResults, error: fallbackError } = await supabase
          .from('notes')
          .select(`
            id,
            title,
            body,
            updated_at,
            folder_id,
            folders!inner(name)
          `)
          .or(`owner_uid.eq.${user.id},note_permissions!inner(collaborator_uid.eq.${user.id})`)
          .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
          .order('updated_at', { ascending: false })
          .limit(searchLimit);

        if (fallbackError) {
          throw fallbackError;
        }

        // Format fallback results
        const formattedResults = fallbackResults.map(note => ({
          id: note.id,
          title: note.title || 'Untitled',
          snippet: note.body ? note.body.substring(0, 200) + '...' : '',
          updated_at: note.updated_at,
          folder_name: note.folders?.name || null
        }));

        return res.status(200).json({
          ok: true,
          data: formattedResults
        });
      }

      res.status(200).json({
        ok: true,
        data: searchResults || []
      });

    } catch (dbError) {
      console.error('Database search error:', dbError);
      
      // Final fallback - simple text search
      const { data: simpleResults, error: simpleError } = await supabase
        .from('notes')
        .select('id, title, body, updated_at')
        .eq('owner_uid', user.id)
        .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(searchLimit);

      if (simpleError) {
        throw simpleError;
      }

      const formattedSimpleResults = simpleResults.map(note => ({
        id: note.id,
        title: note.title || 'Untitled',
        snippet: note.body ? note.body.substring(0, 200) + '...' : '',
        updated_at: note.updated_at,
        folder_name: null
      }));

      res.status(200).json({
        ok: true,
        data: formattedSimpleResults
      });
    }

  } catch (error) {
    console.error('Error searching notes:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
};
