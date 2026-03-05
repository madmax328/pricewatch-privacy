'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

const PARAGRAPHS_PER_PAGE = 3;

export default function StoryBook({
  title,
  content,
  childName,
  theme,
  themeEmoji,
}: {
  title: string;
  content: string;
  childName: string;
  theme: string;
  themeEmoji: string;
}) {
  const paragraphs = content.split('\n\n').filter(Boolean);

  // Build pages: cover + content pages
  const contentPages: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    contentPages.push(paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE));
  }
  const totalPages = contentPages.length + 1; // +1 for cover

  const [page, setPage] = useState(0); // 0 = cover

  const prev = () => setPage((p) => Math.max(0, p - 1));
  const next = () => setPage((p) => Math.min(totalPages - 1, p + 1));

  return (
    <div className="select-none">
      {/* Book */}
      <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden min-h-[420px] flex flex-col">
        {/* Top color strip */}
        <div className="h-2 gradient-primary flex-shrink-0" />

        {/* Page content */}
        <div className="flex-1 flex flex-col p-8 sm:p-12">
          {page === 0 ? (
            /* Cover page */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <span className="text-8xl">{themeEmoji}</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3 leading-tight">
                  {title}
                </h1>
                <p className="text-purple-500 font-medium">
                  Une histoire pour {childName} ✨
                </p>
              </div>
              <button
                onClick={next}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-all shadow-lg"
              >
                <BookOpen className="w-4 h-4" />
                Commencer la lecture
              </button>
            </div>
          ) : page === totalPages - 1 && contentPages[page - 1] === undefined ? (
            /* Last page — fin */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
              <span className="text-6xl">🌟</span>
              <p className="text-xl font-bold text-gray-900">✨ Fin ✨</p>
              <p className="text-gray-400 text-sm">J&apos;espère que tu as aimé cette aventure !</p>
            </div>
          ) : (
            /* Story page */
            <div className="flex-1 flex flex-col">
              <div className="flex-1 space-y-5">
                {contentPages[page - 1]?.map((para, i) => (
                  <p key={i} className="text-gray-700 leading-relaxed text-base sm:text-lg">
                    {para}
                  </p>
                ))}
              </div>

              {/* Last content page gets "Fin" */}
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

        {/* Page counter */}
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
          Page précédente
        </button>

        {/* Dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === page ? 'bg-purple-500 w-5' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={page === totalPages - 1}
          className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:border-purple-300 hover:text-purple-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Page suivante
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
