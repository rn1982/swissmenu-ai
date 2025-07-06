'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ClockIcon, UserGroupIcon, FireIcon } from '@heroicons/react/24/outline'

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  meal: {
    nom: string
    description: string
    ingredients: string[]
    instructions?: string[]
    temps_preparation: number
    temps_cuisson?: number
    difficulte: string
    cout_estime_chf: number
    portions?: number
    conseils?: string
  }
}

export default function RecipeModal({ isOpen, onClose, meal }: RecipeModalProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'facile':
        return 'text-green-600 bg-green-50'
      case 'moyen':
        return 'text-yellow-600 bg-yellow-50'
      case 'difficile':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                      <div className="flex justify-between items-start">
                        <Dialog.Title as="h3" className="text-2xl font-bold leading-6 text-gray-900">
                          {meal.nom}
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                          onClick={onClose}
                        >
                          <span className="sr-only">Fermer</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-600">{meal.description}</p>
                      
                      {/* Recipe Info */}
                      <div className="mt-4 flex flex-wrap gap-4">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-5 w-5 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Préparation: {meal.temps_preparation} min
                            {meal.temps_cuisson && ` | Cuisson: ${meal.temps_cuisson} min`}
                          </span>
                        </div>
                        {meal.portions && (
                          <div className="flex items-center gap-1">
                            <UserGroupIcon className="h-5 w-5 text-gray-400" />
                            <span className="text-sm text-gray-600">{meal.portions} personnes</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <FireIcon className="h-5 w-5 text-gray-400" />
                          <span className={`text-sm px-2 py-1 rounded ${getDifficultyColor(meal.difficulte)}`}>
                            {meal.difficulte}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          {meal.cout_estime_chf.toFixed(2)} CHF
                        </span>
                      </div>
                      
                      {/* Ingredients */}
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Ingrédients</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {meal.ingredients.map((ingredient, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-600 mr-2">•</span>
                              <span className="text-sm text-gray-700">{ingredient}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Instructions */}
                      {meal.instructions && meal.instructions.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h4>
                          <ol className="space-y-3">
                            {meal.instructions.map((step, index) => (
                              <li key={index} className="flex">
                                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                                  {index + 1}
                                </span>
                                <span className="text-sm text-gray-700 pt-1">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      
                      {/* Tips */}
                      {meal.conseils && (
                        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                          <h4 className="text-sm font-semibold text-yellow-800 mb-1">💡 Conseil</h4>
                          <p className="text-sm text-yellow-700">{meal.conseils}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                  >
                    Fermer
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}