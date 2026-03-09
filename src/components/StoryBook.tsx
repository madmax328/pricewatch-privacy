'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Volume2, VolumeX } from 'lucide-react';

const PARAGRAPHS_PER_PAGE = 2;

const LANGUAGE_CODES: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  de: 'de-DE',
};

const THEME_PROMPTS: Record<string, string> = {
  dragons: 'dragon magic castle adventure',
  space: 'space rocket planets stars',
  forest: 'enchanted forest fairy tale',
  ocean: 'ocean dolphins underwater',
  princess: 'princess castle fairy tale',
  dinosaurs: 'cute dinosaur prehistoric',
  superheroes: 'superhero colorful comic',
  animals: 'magical animals forest',
  pirates: 'pirate ship treasure island',
  fairies: 'fairy elf magical garden',
};

interface ChildAvatar {
  gender: 'boy' | 'girl';
  hair: string;
  skin: string;
}

interface PageImage {
  url: string;
  loaded: boolean;
}

function buildImageUrl(
  theme: string,
  childName: string,
  childAvatar: ChildAvatar | undefined,
  pageIndex: number,
  pageContent: string,
  isCover: boolean
): string {
  const themePrompt = THEME_PROMPTS[theme] || 'magical story';
  const avatarDesc = childAvatar
    ? `${childAvatar.gender === 'girl' ? 'little girl' : 'little boy'} with ${childAvatar.hair} hair and ${childAvatar.skin} skin`
    : `child named ${childName}`;

  let prompt: string;
  let size: string;

  if (isCover) {
    prompt = `beautiful children book cover illustration, ${themePrompt}, ${avatarDesc} as the main hero, magical adventure, watercolor style, soft pastel colors, dreamy, no text, no words, storybook art`;
    size = 'width=600&height=400';
  } else {
    const hint = pageContent.slice(0, 120).replace(/[^\w\s]/g, '').trim();
    prompt = `children book illustration, ${themePrompt}, ${avatarDesc}, ${hint}, watercolor style, soft pastel colors, cute, warm light, no text, no words`;
    size = 'width=600&height=360';
  }

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${size}&nologo=true&seed=${pageIndex * 37 + 11}`;
}

export default function StoryBook({
  title,
  content,
  childName,
  theme,
  themeEmoji,
  language = 'fr',
  childAvatar,
}: {
  title: string;
  content: string;
  childName: string;
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

  const [page, setPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pageImages, setPageImages] = useState<Record<number, PageImage>>({});
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Auto-generate image for current page + preload next
  useEffect(() => {
    [page, page + 1].forEach((p) => {
      if (p >= totalPages || pageImages[p]) return;
      const isCover = p === 0;
      const pageContent = isCover ? '' : contentPages[p - 1]?.join(' ') || '';
      const url = buildImageUrl(theme, childName, childAvatar, p, pageContent, isCover);
      setPageImages((prev) => ({ ...prev, [p]: { url, loaded: false } }));
    });
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const markLoaded = (p: number) => {
    setPageImages((prev) =>
      prev[p] ? { ...prev, [p]: { ...prev[p], loaded: true } } : prev
    );
  };

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

  const currentImage = pageImages[page];

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
            <><VolumeX className="w-4 h-4" /> Arrêter la lecture</>
          ) : (
            <><Volume2 className="w-4 h-4" /> Écouter l&apos;histoire</>
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
            {currentImage ? (
              <>
                {!currentImage.loaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full animate-spin"
                      style={{
                        border: '3px solid #e9d5ff',
                        borderTopColor: '#9333ea',
                      }}
                    />
                    <span className="text-sm text-purple-400 font-medium">
                      Illustration en cours...
                    </span>
                  </div>
                )}
                <img
                  key={currentImage.url}
                  src={currentImage.url}
                  alt="Illustration"
                  className={`w-full object-cover transition-opacity duration-700 ${
                    currentImage.loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
                  }`}
                  style={{ maxHeight: '400px' }}
                  onLoad={() => markLoaded(page)}
                />
              </>
            ) : (
              <div
                className="flex items-center justify-center"
                style={{ minHeight: '260px' }}
              >
                <div
                  className="w-10 h-10 rounded-full animate-spin"
                  style={{
                    border: '3px solid #e9d5ff',
                    borderTopColor: '#9333ea',
                  }}
                />
              </div>
            )}

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
                  {themeEmoji} Une histoire pour
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
                  Commencer l&apos;histoire
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
                      ✨ Fin ✨
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
          Précédent
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
          Suivant
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
