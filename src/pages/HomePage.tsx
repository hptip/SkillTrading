import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Coins, BookOpen, Users, Star, ArrowRight, Shield, Zap, Clock } from 'lucide-react';

export const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ST</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">SkillTrading</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate('/marketplace')}>Go to Marketplace</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>Sign in</Button>
                <Button onClick={() => navigate('/register')}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Coins className="w-4 h-4" />
          Earn & spend Skill Coins (SKC)
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
          Trade Skills,
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent"> Not Money</span>
        </h1>

        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          A peer-to-peer skill exchange platform for students. Teach what you know, learn what you need — all with Skill Coins.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/register')} icon={<ArrowRight className="w-5 h-5" />}>
            Start for Free — Get 100 SKC
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/marketplace')}>
            Browse Marketplace
          </Button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: <BookOpen className="w-8 h-8 text-violet-600" />,
              title: 'Share Your Skills',
              desc: 'Create skill listings, set your rate, and get booked by fellow students.',
              bg: 'bg-violet-50'
            },
            {
              icon: <Coins className="w-8 h-8 text-amber-600" />,
              title: 'Earn Skill Coins',
              desc: 'Get paid in SKC when you teach. Start with 100 free coins when you register!',
              bg: 'bg-amber-50'
            },
            {
              icon: <Users className="w-8 h-8 text-blue-600" />,
              title: 'Learn from Peers',
              desc: 'Find students with the skills you need. Book sessions easily and grow together.',
              bg: 'bg-blue-50'
            },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className={`w-14 h-14 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">How it works</h2>
          <p className="text-gray-500 mt-2">Simple, transparent, and fair for everyone</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '01', icon: <Zap className="w-6 h-6" />, title: 'Register', desc: 'Create account and get 100 SKC free' },
            { step: '02', icon: <BookOpen className="w-6 h-6" />, title: 'List a Skill', desc: 'Create your skill listing for approval' },
            { step: '03', icon: <Clock className="w-6 h-6" />, title: 'Book Sessions', desc: 'Learners book your time, SKC is held' },
            { step: '04', icon: <Star className="w-6 h-6" />, title: 'Complete & Earn', desc: 'Finish session, get paid 95% in SKC' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 text-white">
                {s.icon}
              </div>
              <div className="text-xs font-bold text-violet-500 mb-1">STEP {s.step}</div>
              <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SKC Rules */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 text-white">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Platform Rules</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Welcome Bonus', val: '100 SKC on registration' },
              { label: 'Skill Price Range', val: '30 – 300 SKC per hour' },
              { label: 'Platform Fee', val: '5% per completed session' },
              { label: 'Teacher Earns', val: '95% of booking value' },
              { label: 'Free Cancellation', val: '24h before session' },
              { label: 'Review Window', val: '7 days after completion' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-3">
                <span className="text-violet-200 text-sm">{r.label}</span>
                <span className="font-semibold text-white text-sm">{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to start trading skills?</h2>
        <p className="text-gray-500 mb-8">Join thousands of students learning and teaching on SkillTrading</p>
        <Button size="lg" onClick={() => navigate('/register')}>
          Create Free Account — Get 100 SKC 🎁
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          © 2024 SkillTrading Platform. Built for students, by students.
        </div>
      </footer>
    </div>
  );
};
