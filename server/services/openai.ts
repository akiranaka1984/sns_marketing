/**
 * OpenAI Service
 *
 * Wrapper utilities for OpenAI API calls used across the platform.
 */

/**
 * Generate an image using DALL-E 3 for social media posts.
 * Returns the image URL or null if generation fails/is disabled.
 *
 * Cost note: DALL-E 3 costs $0.04-0.08 per image (standard quality).
 * This function should only be called when agent.imageGenerationEnabled is true.
 */
export async function generatePostImage(
  postContent: string,
  style: 'vivid' | 'natural' = 'natural'
): Promise<string | null> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const prompt = `Create a visually engaging social media image that complements this post: "${postContent.slice(0, 200)}".
Style: Clean, modern, professional. No text overlay. Suitable for X/Twitter. Aspect ratio 16:9.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024', // 16:9 for Twitter
        quality: 'standard',
        style,
      }),
    });

    if (!response.ok) {
      console.error('[DALL-E] Generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.url ?? null;
  } catch (error) {
    console.error('[DALL-E] Error:', error);
    return null;
  }
}
