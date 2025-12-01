import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-white mb-4">
              🦒 Kirin
            </h1>
            <p className="text-xl text-purple-200">
              Self-hosted LLM-powered content filtering with job queue architecture
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-500/20">
              <h3 className="text-sm font-semibold text-purple-300 uppercase mb-2">Collectors</h3>
              <p className="text-3xl font-bold text-white">3</p>
              <p className="text-sm text-purple-200 mt-2">Slack, Signal, Twitter</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-500/20">
              <h3 className="text-sm font-semibold text-purple-300 uppercase mb-2">Processing</h3>
              <p className="text-3xl font-bold text-white">LLM</p>
              <p className="text-sm text-purple-200 mt-2">Ollama + Qwen</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-500/20">
              <h3 className="text-sm font-semibold text-purple-300 uppercase mb-2">Status</h3>
              <p className="text-3xl font-bold text-green-400">●</p>
              <p className="text-sm text-purple-200 mt-2">Online</p>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <a 
              href="/api/queues" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg p-8 transition-all transform hover:scale-105 shadow-xl"
            >
              <h2 className="text-2xl font-bold text-white mb-2">📊 Queue Stats</h2>
              <p className="text-purple-100">
                View real-time job queue statistics (JSON API)
              </p>
            </a>

            <div 
              className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-8 shadow-xl opacity-50 cursor-not-allowed"
            >
              <h2 className="text-2xl font-bold text-white mb-2">📝 Summaries</h2>
              <p className="text-blue-100">
                Browse filtered content (coming soon)
              </p>
            </div>
          </div>

          {/* Architecture Info */}
          <div className="bg-white/5 backdrop-blur-lg rounded-lg p-8 border border-purple-500/10">
            <h3 className="text-xl font-bold text-white mb-4">Architecture</h3>
            <div className="space-y-3 text-purple-200">
              <p>✅ <span className="font-semibold">BullMQ</span> - Job queue with Redis backend</p>
              <p>✅ <span className="font-semibold">Ollama</span> - Self-hosted LLM inference</p>
              <p>✅ <span className="font-semibold">PostgreSQL + pgvector</span> - Vector storage</p>
              <p>✅ <span className="font-semibold">Next.js</span> - Modern dashboard</p>
              <p>✅ <span className="font-semibold">TypeScript</span> - Type-safe codebase</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

