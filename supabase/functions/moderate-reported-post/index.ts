import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REPORT_THRESHOLD = 3; // Number of reports before AI review

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { response_id } = await req.json();

    if (!response_id) {
      return new Response(
        JSON.stringify({ error: 'response_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the post and its reports
    const { data: post, error: postError } = await supabase
      .from('challenge_responses')
      .select('*, reports:post_reports(reason, details)')
      .eq('id', response_id)
      .single();

    if (postError || !post) {
      console.error('Error fetching post:', postError);
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we've reached the threshold for AI review
    if (post.report_count < REPORT_THRESHOLD) {
      console.log(`Post ${response_id} has ${post.report_count} reports, below threshold of ${REPORT_THRESHOLD}`);
      return new Response(
        JSON.stringify({ 
          action: 'none', 
          message: 'Report count below threshold',
          report_count: post.report_count 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Already processed
    if (post.is_flagged || post.is_hidden) {
      return new Response(
        JSON.stringify({ 
          action: 'already_processed', 
          is_flagged: post.is_flagged,
          is_hidden: post.is_hidden 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI moderation not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compile report reasons for AI analysis
    const reportReasons = post.reports?.map((r: any) => `- ${r.reason}${r.details ? `: ${r.details}` : ''}`).join('\n') || '';

    const moderationPrompt = `You are a content moderation AI. Analyze this reported social media post and determine if it should be flagged or hidden.

POST CONTENT:
- Caption: "${post.caption || 'No caption'}"
- Front photo URL: ${post.front_photo_url}
- Back photo URL: ${post.back_photo_url}

REPORT REASONS (${post.report_count} reports):
${reportReasons}

Based on the reports and content, determine:
1. Is this content harmful, inappropriate, or violating community guidelines?
2. What action should be taken?

IMPORTANT: Be conservative - only hide truly harmful content. Flag questionable content for human review.`;

    console.log('Sending to AI for moderation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a content moderation AI. Respond with JSON only.' },
          { role: 'user', content: moderationPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'moderate_content',
              description: 'Determine moderation action for reported content',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['approve', 'flag', 'hide'],
                    description: 'approve: content is fine, flag: needs human review, hide: definitely harmful'
                  },
                  reason: {
                    type: 'string',
                    description: 'Brief explanation of the decision'
                  },
                  severity: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Severity level of the issue if any'
                  }
                },
                required: ['action', 'reason', 'severity'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'moderate_content' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    // Parse AI decision
    let decision = { action: 'flag', reason: 'Unable to parse AI response', severity: 'medium' };
    
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        decision = JSON.parse(toolCall.function.arguments);
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
    }

    console.log('Moderation decision:', decision);

    // Apply the decision
    const updateData: any = {};

    if (decision.action === 'hide') {
      updateData.is_hidden = true;
      updateData.is_flagged = true;
      updateData.flag_reason = decision.reason;
    } else if (decision.action === 'flag') {
      updateData.is_flagged = true;
      updateData.flag_reason = decision.reason;
    }
    // 'approve' means no action needed

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('challenge_responses')
        .update(updateData)
        .eq('id', response_id);

      if (updateError) {
        console.error('Error updating post:', updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({
        action: decision.action,
        reason: decision.reason,
        severity: decision.severity,
        post_id: response_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in moderate-reported-post:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
