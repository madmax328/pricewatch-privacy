'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { generateIllustrationSvg } from '@/lib/illustrations';

const PARAGRAPHS_PER_PAGE = 2;

const LANGUAGE_CODES: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  de: 'de-DE',
};

interface ChildAvatar {
  gender: 'boy' | 'girl';
  hair: string;
  skin: string;
}

export default function StoryBook({
  title,
  content,
  childName,
  childAge = 6,
  theme,
  themeEmoji,
  language = 'fr',
  childAvatar,
}: {
  title: string;
  content: string;
  childName: string;
  childAge?: number;
  theme: string;
  themeEmoji: string;
  language?: string;
  childAvatar?: ChildAvatar;
}) {
  const paragraphs = content.split('\n\n').filter(Boolean);

  const contentPages: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    contentPages.push(paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE));
  }
  const totalPages = contentPages.length + 1; // +1 for cover

  const t = useTranslations('story');

  const [page, setPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // SVG illustrations generated locally — instant, no external API
  const illustrationUrl = generateIllustrationSvg(theme, page);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const handleAudio = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = LANGUAGE_CODES[language] || 'fr-FR';
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const prev = () => setPage((p) => Math.max(0, p - 1));
  const next = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div className="select-none">
      {/* Audio button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={handleAudio}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            isPlaying
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
              : 'bg-white border border-purple-200 text-purple-700 hover:bg-purple-50'
          }`}
        >
          {isPlaying ? (
            <><VolumeX className="w-4 h-4" /> {t('stopListening')}</>
          ) : (
            <><Volume2 className="w-4 h-4" /> {t('listen')}</>
          )}
        </button>
      </div>

      {/* Book container */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#fdf8f0' }}
      >
        {/* Spine */}
        <div
          className="absolute left-0 top-0 bottom-0 w-5 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, #78350f, #b45309, #fcd34d80, #b45309, #78350f)',
            boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          }}
        />

        <div className="ml-5">
          {/* Illustration */}
          <div
            className="relative overflow-hidden bg-gradient-to-b from-purple-100 to-purple-50"
            style={{ minHeight: '260px' }}
          >
            <img
              key={illustrationUrl}
              src={illustrationUrl}
              alt="Illustration"
              className="w-full object-cover"
              style={{ maxHeight: '400px', display: 'block' }}
            />

            {/* Page indicator on illustration */}
            {page > 0 && (
              <div className="absolute bottom-2 right-3 px-2.5 py-1 rounded-full text-white text-xs font-semibold backdrop-blur-sm bg-black/30">
                {page} / {totalPages - 1}
              </div>
            )}
          </div>

          {/* Text area */}
          <div
            className="px-8 py-7 sm:px-10 sm:py-8"
            style={{ background: '#fdf8f0' }}
          >
            {page === 0 ? (
              /* Cover page text */
              <div className="text-center">
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-3"
                  style={{ color: '#b45309' }}
                >
                  {themeEmoji} {t('storyFor')}
                </p>
                <h1
                  className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 leading-tight"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {title}
                </h1>
                <p
                  className="text-xl text-gray-500 italic mb-8"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {childName}
                </p>
                <button
                  onClick={next}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-base transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #b45309, #92400e)' }}
                >
                  <BookOpen className="w-5 h-5" />
                  {t('startReading')}
                </button>
              </div>
            ) : (
              /* Story page text */
              <div>
                <div className="space-y-5">
                  {contentPages[page - 1]?.map((para, i) => (
                    <p
                      key={i}
                      className="text-gray-800 leading-relaxed text-base sm:text-lg"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {para}
                    </p>
                  ))}
                </div>
                {page === totalPages - 1 && (
                  <div className="mt-8 text-center">
                    <span
                      className="text-lg font-bold italic"
                      style={{ color: '#b45309' }}
                    >
                      {t('end')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom page shadow lines (book effect) */}
        <div
          className="h-1.5"
          style={{
            background:
              'linear-gradient(to bottom, #e5e0d8, #d6d0c8)',
            boxShadow: '0 -1px 0 #c8c0b0',
          }}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={prev}
          disabled={page === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: page === 0 ? '#e5e7eb' : '#d97706',
            color: page === 0 ? '#9ca3af' : '#b45309',
            background: page === 0 ? 'transparent' : '#fffbeb',
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          {t('prev')}
        </button>

        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === page ? '20px' : '8px',
                background: i === page ? '#b45309' : '#d1d5db',
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={page === totalPages - 1}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: page === totalPages - 1 ? '#e5e7eb' : '#d97706',
            color: page === totalPages - 1 ? '#9ca3af' : '#b45309',
            background: page === totalPages - 1 ? 'transparent' : '#fffbeb',
          }}
        >
          {t('next')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
