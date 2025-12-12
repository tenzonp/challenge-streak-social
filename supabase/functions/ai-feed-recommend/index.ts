import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, interests, recent_likes, viewed_posts } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch recent posts with engagement data
    const { data: posts } = await supabase
      .from('challenge_responses')
      .select(`
        id,
        caption,
        created_at,
        user:profiles!challenge_responses_user_id_fkey(display_name, username, interests, streak),
        reactions(emoji)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ recommended_ids: [], scores: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out already viewed posts
    const unviewedPosts = posts.filter(p => !viewed_posts?.includes(p.id));

    // Prepare post summaries for AI
    const postSummaries = unviewedPosts.slice(0, 20).map(p => ({
      id: p.id,
      caption: p.caption || 'No caption',
      creator_interests: (p.user as any)?.interests || [],
      creator_streak: (p.user as any)?.streak || 0,
      likes: p.reactions?.length || 0,
      recency_hours: Math.floor((Date.now() - new Date(p.created_at).getTime()) / 3600000)
    }));

    console.log(`Processing ${postSummaries.length} posts for user with interests: ${interests?.join(', ')}`);

    // Use Lovable AI to score and rank posts
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a social media feed algorithm. Score posts 1-100 based on relevance to user interests, engagement potential, and freshness. Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: `User interests: ${interests?.join(', ') || 'general content'}
User recently liked posts about: ${recent_likes?.join(', ') || 'various topics'}

Score these posts for this user (higher = more relevant, max 100):
${JSON.stringify(postSummaries, null, 2)}

Return JSON: { "scores": { "post_id": score, ... } }`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'rank_posts',
              description: 'Score posts for feed ranking',
              parameters: {
                type: 'object',
                properties: {
                  scores: {
                    type: 'object',
                    description: 'Map of post IDs to relevance scores (1-100)'
                  }
                },
                required: ['scores']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'rank_posts' } }
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      // Fallback to simple ranking
      const fallbackScores: Record<string, number> = {};
      postSummaries.forEach((p, i) => {
        fallbackScores[p.id] = 100 - i * 5 + p.likes * 2;
      });
      return new Response(
        JSON.stringify({ 
          recommended_ids: Object.keys(fallbackScores).sort((a, b) => fallbackScores[b] - fallbackScores[a]),
          scores: fallbackScores 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    let scores: Record<string, number> = {};

    try {
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        scores = parsed.scores || {};
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      // Fallback scoring
      postSummaries.forEach((p, i) => {
        scores[p.id] = 100 - i * 5 + p.likes * 2;
      });
    }

    // Sort by score descending
    const recommendedIds = Object.keys(scores).sort((a, b) => (scores[b] || 0) - (scores[a] || 0));

    console.log(`Returning ${recommendedIds.length} recommended posts`);

    return new Response(
      JSON.stringify({ recommended_ids: recommendedIds, scores }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in AI feed recommendation:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error', recommended_ids: [], scores: {} }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
