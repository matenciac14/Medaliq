'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { translateBodyPart } from '@/lib/gym/labels'

type FeaturedExercise = {
  id: string
  name: string
  nameEs: string | null
  bodyPart: string
  gif: string | null
}

function ExerciseCard({ ex }: { ex: FeaturedExercise }) {
  const [imgError, setImgError] = useState(false)

  return (
    <Link
      href={`/gym/exercises?open=${ex.id}`}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="bg-gray-50 aspect-square overflow-hidden relative flex items-center justify-center">
        {ex.gif && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ex.gif}
            alt={ex.nameEs ?? ex.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="text-gray-200">
            <Dumbbell size={28} />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="font-semibold text-xs text-gray-900 line-clamp-2 leading-snug">
          {ex.nameEs ?? ex.name}
        </p>
        <span className="inline-block mt-1 text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
          {translateBodyPart(ex.bodyPart)}
        </span>
      </div>
    </Link>
  )
}

export default function FeaturedExercisesGrid({ exercises }: { exercises: FeaturedExercise[] }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {exercises.map(ex => <ExerciseCard key={ex.id} ex={ex} />)}
    </div>
  )
}
