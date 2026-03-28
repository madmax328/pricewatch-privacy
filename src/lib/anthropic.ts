import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateStoryParams {
  childName: string;
  childAge: number;
  theme: string;
  language: string;
}

interface GeneratedStory {
  title: string;
  content: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  fr: 'French',
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  de: 'German',
};

export async function generateStory({
  childName,
  childAge,
  theme,
  language,
}: GenerateStoryParams): Promise<GeneratedStory> {
  const langName = LANGUAGE_NAMES[language] || 'French';

  // Age-based writing style
  let ageGuidelines: string;
  if (childAge <= 5) {
    ageGuidelines = `- Very short, simple sentences (5-8 words max)
- Extremely basic vocabulary, no difficult words
- Lots of repetition and rhythm (like "he ran and ran and ran")
- Onomatopoeia and sound effects ("BOOM!", "splash!", "whoosh!")
- Simple, concrete emotions (happy, scared, surprised)
- Very clear and direct moral lesson
- Gentle, soothing ending to help sleep`;
  } else if (childAge <= 9) {
    ageGuidelines = `- Medium-length sentences with some variety
- Age-appropriate vocabulary with occasional new words in context
- Include dialogue between characters
- Build suspense and a small challenge the hero must overcome
- Describe the setting vividly but not too complexly
- Clear moral lesson but naturally woven into the story
- Exciting adventure with a satisfying happy ending`;
  } else {
    ageGuidelines = `- Longer, more complex sentences with varied structure
- Rich vocabulary, metaphors, and descriptive language
- Multi-dimensional characters with real motivations
- Meaningful emotional conflict or moral dilemma
- Subplots and plot twists are welcome
- Deeper, nuanced moral lesson (friendship, courage, identity, responsibility)
- Avoid anything "babyish" — treat the reader as a young adult
- Engaging, page-turner style with real tension and satisfying resolution`;
  }

  const prompt = `You are a talented children's picture book author. Write a ${childAge <= 9 ? 'magical bedtime' : 'captivating'} story entirely in ${langName}, perfectly calibrated for a ${childAge}-year-old reader.

This story will be printed as an illustrated book with exactly 26 pages. Each paragraph you write will appear on its own page, so each paragraph MUST be rich and self-contained.

Story requirements:
- The main hero/heroine is a child named "${childName}", aged ${childAge} years old
- Theme: ${theme}
- Language: ${langName} (VERY IMPORTANT: the entire story must be written in ${langName})
- STRUCTURE: Write EXACTLY 20 paragraphs separated by blank lines (\\n\\n)
- EACH paragraph must contain ${childAge <= 5 ? '3-5' : childAge <= 9 ? '4-6' : '5-8'} complete sentences
- Total length: ${childAge <= 5 ? '900-1100' : childAge <= 9 ? '1100-1400' : '1400-1800'} words
- Writing style for age ${childAge}:
${ageGuidelines}
- Story arc: paragraphs 1-4 introduce ${childName} and the setting; paragraphs 5-12 build the adventure and challenge; paragraphs 13-18 reach the exciting climax; paragraphs 19-20 resolve happily with a gentle moral
- "${childName}" must be the central hero who solves the problem through their own initiative
- Make every paragraph visually descriptive so it can be illustrated (describe what can be seen)

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{
  "title": "The story title in ${langName}",
  "content": "The full story text in ${langName}, with exactly 20 paragraphs separated by \\n\\n"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const parsed = JSON.parse(responseText);
    return {
      title: parsed.title || `The Adventure of ${childName}`,
      content: parsed.content || responseText,
    };
  } catch {
    // Fallback if JSON parsing fails
    const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
    const contentMatch = responseText.match(/"content"\s*:\s*"([\s\S]+?)"\s*\}/);
    return {
      title: titleMatch?.[1] || `The Adventure of ${childName}`,
      content: contentMatch?.[1]?.replace(/\\n/g, '\n') || responseText,
    };
  }
}
