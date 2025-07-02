import Link from 'next/link'

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Génération de votre menu
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Vos préférences ont été sauvegardées avec succès !
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Prochaines étapes
            </h2>
            <p className="text-blue-800">
              La génération intelligente de menus avec intégration Migros sera implémentée dans la phase suivante.
              Votre système de base est maintenant opérationnel !
            </p>
          </div>
          <div className="space-x-4">
            <Link 
              href="/preferences"
              className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Modifier les préférences
            </Link>
            <Link 
              href="/"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}