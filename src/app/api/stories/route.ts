import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { generateStory } from '@/lib/anthropic';
import Story from '@/models/Story';
import User from '@/models/User';

const FREE_STORY_LIMIT = 3;    // per month
const PREMIUM_STORY_LIMIT = 1; // per day

// GET /api/stories — fetch user's stories
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userId = (session.user as { id: string }).id;
    const stories = await Story.find({ userId }).sort({ createdAt: -1 }).limit(50);

    return NextResponse.json({ stories });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GET /api/stories error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/stories — generate a new story
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized — veuillez vous reconnecter.' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable en base de données.' }, { status: 404 });
    }

    const now = new Date();

    // --- Free plan: monthly limit ---
    if (user.plan === 'free') {
      const resetDate = new Date(user.storiesResetDate);
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        user.storiesUsedThisMonth = 0;
        user.storiesResetDate = now;
      }
      if (user.storiesUsedThisMonth >= FREE_STORY_LIMIT) {
        return NextResponse.json(
          { error: 'Monthly limit reached', code: 'LIMIT_REACHED' },
          { status: 403 }
        );
      }
    }

    // --- Premium plan: daily limit ---
    if (user.plan === 'premium') {
      const dailyReset = new Date(user.storiesDailyResetDate);
      const sameDay =
        now.getDate() === dailyReset.getDate() &&
        now.getMonth() === dailyReset.getMonth() &&
        now.getFullYear() === dailyReset.getFullYear();

      if (!sameDay) {
        user.storiesCreatedToday = 0;
        user.storiesDailyResetDate = now;
      }

      if (user.storiesCreatedToday >= PREMIUM_STORY_LIMIT) {
        return NextResponse.json(
          { error: 'Daily limit reached', code: 'DAILY_LIMIT_REACHED' },
          { status: 403 }
        );
      }
    }

    // superpremium: no limit check needed

    const body = await req.json();
    const { childName, childAge, theme, language, childAvatar } = body;

    if (!childName || !childAge || !theme || !language) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate story with AI
    let generated;
    try {
      generated = await generateStory({ childName, childAge, theme, language });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Anthropic error:', msg);
      return NextResponse.json({ error: `Erreur IA : ${msg}` }, { status: 500 });
    }

    // Save to database
    const story = await Story.create({
      userId,
      childName,
      childAge,
      theme,
      language,
      title: generated.title,
      content: generated.content,
      locale: language,
      ...(childAvatar && { childAvatar }),
    });

    // Increment appropriate counter
    if (user.plan === 'free') {
      user.storiesUsedThisMonth += 1;
    } else if (user.plan === 'premium') {
      user.storiesCreatedToday += 1;
    }
    await user.save();

    return NextResponse.json({ story }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('POST /api/stories error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
