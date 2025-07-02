import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          SwissMenu AI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Votre planificateur de menus intelligent avec intégration Migros
        </p>
        <Link 
          href="/preferences"
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Commencer
        </Link>
      </div>
    </div>
  )
}