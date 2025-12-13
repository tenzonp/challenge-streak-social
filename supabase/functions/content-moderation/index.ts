import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Banned words and patterns (simplified list, expand as needed)
const BANNED_WORDS = [
  'nude', 'naked', 'porn', 'xxx', 'nsfw', 'sex', 'fuck', 'shit', 'ass', 'bitch',
  'dick', 'pussy', 'cock', 'cum', 'slut', 'whore', 'nigger', 'faggot', 'retard'
];

const SUSPICIOUS_PATTERNS = [
  /\b(kill|murder|die|suicide)\b/gi,
  /\b(hate|racist|racism)\b/gi,
  /\b(drugs?|cocaine|heroin|meth)\b/gi,
];

interface ModerationResult {
  isClean: boolean;
  flaggedWords: string[];
  flaggedPatterns: string[];
  confidence: number;
  category?: string;
}

function moderateText(text: string): ModerationResult {
  const lowercaseText = text.toLowerCase();
  const flaggedWords: string[] = [];
  const flaggedPatterns: string[] = [];
  
  // Check banned words
  for (const word of BANNED_WORDS) {
    if (lowercaseText.includes(word)) {
      flaggedWords.push(word);
    }
  }
  
  // Check suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      flaggedPatterns.push(...matches);
    }
  }
  
  const isClean = flaggedWords.length === 0 && flaggedPatterns.length === 0;
  const confidence = isClean ? 1.0 : Math.min(0.1 + (flaggedWords.length + flaggedPatterns.length) * 0.15, 0.95);
  
  return {
    isClean,
    flaggedWords,
    flaggedPatterns,
    confidence,
    category: flaggedWords.length > 0 ? 'explicit' : flaggedPatterns.length > 0 ? 'suspicious' : undefined
  };
}

async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('No LOVABLE_API_KEY, skipping image moderation');
    return { isClean: true, flaggedWords: [], flaggedPatterns: [], confidence: 0.5 };
  }

  try {
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
            content: 'You are a content moderation AI. Analyze images for nudity, explicit content, violence, or inappropriate material. Respond with JSON only.'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image for inappropriate content. Return JSON: { "isClean": boolean, "category": "safe" | "suggestive" | "explicit" | "violence", "confidence": 0-1, "reason": string }' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'moderate_image',
              description: 'Report image moderation result',
              parameters: {
                type: 'object',
                properties: {
                  isClean: { type: 'boolean' },
                  category: { type: 'string', enum: ['safe', 'suggestive', 'explicit', 'violence'] },
                  confidence: { type: 'number' },
                  reason: { type: 'string' }
                },
                required: ['isClean', 'category', 'confidence']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'moderate_image' } }
      }),
    });

    if (!response.ok) {
      console.error('AI moderation failed:', response.status);
      return { isClean: true, flaggedWords: [], flaggedPatterns: [], confidence: 0.5 };
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        isClean: parsed.isClean && parsed.category === 'safe',
        flaggedWords: [],
        flaggedPatterns: parsed.reason ? [parsed.reason] : [],
        confidence: parsed.confidence || 0.8,
        category: parsed.category
      };
    }
  } catch (error) {
    console.error('Image moderation error:', error);
  }

  return { isClean: true, flaggedWords: [], flaggedPatterns: [], confidence: 0.5 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, imageUrl, type } = await req.json();
    
    let result: ModerationResult = { isClean: true, flaggedWords: [], flaggedPatterns: [], confidence: 1.0 };
    
    if (text) {
      const textResult = moderateText(text);
      result = { ...result, ...textResult };
    }
    
    if (imageUrl && type !== 'text-only') {
      const imageResult = await moderateImage(imageUrl);
      if (!imageResult.isClean) {
        result.isClean = false;
        result.flaggedPatterns = [...result.flaggedPatterns, ...imageResult.flaggedPatterns];
        result.category = imageResult.category || result.category;
        result.confidence = Math.max(result.confidence, imageResult.confidence);
      }
    }

    console.log(`Moderation result: ${result.isClean ? 'CLEAN' : 'FLAGGED'} - ${result.category || 'none'}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Moderation error:', error);
    return new Response(
      JSON.stringify({ error: error.message, isClean: true, confidence: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
