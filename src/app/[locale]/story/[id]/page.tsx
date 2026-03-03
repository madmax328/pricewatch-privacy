import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Story from '@/models/Story';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Globe, Sparkles } from 'lucide-react';
import StoryActions from '@/components/StoryActions';

const THEME_EMOJIS: Record<string, string> = {
  dragons: '🐉', space: '🚀', forest: '🌲', ocean: '🌊',
  princess: '👸', dinosaurs: '🦕', superheroes: '🦸',
  animals: '🐾', pirates: '🏴‍☠️', fairies: '🧚',
};

export default async function StoryPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/${locale}/auth/signin`);

  await connectToDatabase();
  const userId = (session.user as { id: string }).id;
  const story = await Story.findOne({ _id: id, userId }).lean() as {
    _id: { toString(): string };
    title: string;
    childName: string;
    childAge: number;
    theme: string;
    language: string;
    content: string;
    createdAt: Date;
  } | null;

  if (!story) notFound();

  const wordCount = story.content.split(' ').length;
  const readingTime = Math.ceil(wordCount / 150);
  const paragraphs = story.content.split('\n\n').filter(Boolean);

  return (
    <div className="min-h-screen gradient-warm py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Back button */}
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à mes histoires
        </Link>

        {/* Story card */}
        <article className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header gradient */}
          <div className="h-3 gradient-primary" />

          <div className="p-8 sm:p-12">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-5xl">{THEME_EMOJIS[story.theme] || '📖'}</span>
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold">
                    {story.childName} · {story.childAge} ans
                  </span>
                  <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {story.language.toUpperCase()}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {readingTime} min
                  </span>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-8 leading-tight">
              {story.title}
            </h1>

            {/* Story content */}
            <div className="prose prose-lg max-w-none">
              {paragraphs.map((para, i) => (
                <p key={i} className="text-gray-700 leading-relaxed mb-4 text-base sm:text-lg">
                  {para}
                </p>
              ))}
            </div>

            {/* The end */}
            <div className="mt-10 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-50 to-orange-50 rounded-full border border-purple-100">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-semibold text-purple-700">✨ Fin ✨</span>
              </div>
            </div>
          </div>
        </article>

        {/* Actions */}
        <StoryActions locale={locale} storyId={story._id.toString()} />

        {/* Reading tips */}
        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-blue-900 text-sm mb-1">Conseil lecture</p>
              <p className="text-blue-700 text-sm">
                Lisez cette histoire à voix haute avec votre enfant. Laissez-le continuer certaines phrases ou inventer la suite ! C&apos;est encore plus magique ensemble. 🌟
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
