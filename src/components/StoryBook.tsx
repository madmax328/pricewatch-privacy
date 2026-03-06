'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Volume2, VolumeX, Image } from 'lucide-react';

const PARAGRAPHS_PER_PAGE = 3;

const LANGUAGE_CODES: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-BR',
  de: 'de-DE',
};

const THEME_PROMPTS: Record<string, string> = {
  dragons: 'dragon magic castle',
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

export default function StoryBook({
  title,
  content,
  childName,
  theme,
  themeEmoji,
  language = 'fr',
}: {
  title: string;
  content: string;
  childName: string;
  theme: string;
  themeEmoji: string;
  language?: string;
}) {
  const paragraphs = content.split('\n\n').filter(Boolean);

  const contentPages: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    contentPages.push(paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE));
  }
  const totalPages = contentPages.length + 1; // +1 for cover

  const [page, setPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showIllustration, setShowIllustration] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const themePrompt = THEME_PROMPTS[theme] || 'magical story';
  const illustrationUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    `children book illustration ${themePrompt} for child named ${childName}, watercolor style, soft colors, cute, no text`
  )}?width=400&height=280&nologo=true&seed=42`;

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
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
            <><VolumeX className="w-4 h-4" /> Arrêter la lecture</>
          ) : (
            <><Volume2 className="w-4 h-4" /> Écouter l&apos;histoire</>
          )}
        </button>
      </div>

      {/* Book */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden min-h-[420px] flex flex-col">
        <div className="h-2 gradient-primary flex-shrink-0" />

        <div className="flex-1 flex flex-col p-8 sm:p-12">
          {page === 0 ? (
            /* Cover page */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
              {/* Illustration */}
              {showIllustration ? (
                <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-md bg-purple-50 min-h-[160px] flex items-center justify-center">
                  {!imgLoaded && (
                    <div className="flex flex-col items-center gap-2 py-8 text-purple-300">
                      <div className="w-6 h-6 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">Génération en cours...</span>
                    </div>
                  )}
                  <img
                    src={illustrationUrl}
                    alt={`Illustration pour ${title}`}
                    className={`w-full h-auto transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
                    onLoad={() => setImgLoaded(true)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-8xl">{themeEmoji}</span>
                  <button
                    onClick={() => setShowIllustration(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-200 text-purple-600 text-sm font-medium hover:bg-purple-50 transition-colors"
                  >
                    <Image className="w-4 h-4" />
                    Générer l&apos;illustration IA
                  </button>
                </div>
              )}

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
                  {title}
                </h1>
                <p className="text-purple-500 font-medium">
                  Une histoire pour {childName} ✨
                </p>
              </div>

              <button
                onClick={next}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-all shadow-lg"
              >
                <BookOpen className="w-4 h-4" />
                Commencer la lecture
              </button>
            </div>
          ) : (
            /* Story pages */
            <div className="flex-1 flex flex-col">
              <div className="flex-1 space-y-5">
                {contentPages[page - 1]?.map((para, i) => (
                  <p key={i} className="text-gray-700 leading-relaxed text-base sm:text-lg">
                    {para}
                  </p>
                ))}
              </div>

              {page === totalPages - 1 && (
                <div className="mt-8 text-center">
                  <span className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-50 to-orange-50 rounded-full border border-purple-100 text-sm font-semibold text-purple-700">
                    ✨ Fin ✨
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {page > 0 && (
          <div className="flex-shrink-0 pb-4 text-center">
            <span className="text-xs text-gray-300 font-medium tracking-widest uppercase">
              {page} / {totalPages - 1}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={prev}
          disabled={page === 0}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </button>

        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-2 rounded-full transition-all ${
                i === page ? 'bg-purple-500 w-5' : 'w-2 bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={page === totalPages - 1}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Suivant
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
