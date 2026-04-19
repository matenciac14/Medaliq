import { Button } from "@/components/ui/button";
import RevealOnScroll from "./_components/RevealOnScroll";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          70%  { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        .anim-fade-up   { animation: fadeUp 0.7s ease both; }
        .anim-fade-in   { animation: fadeIn 0.7s ease both; }
        .anim-float     { animation: float 3.5s ease-in-out infinite; }
        .anim-pulse-cta { animation: pulse-ring 2s ease-in-out infinite; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-600 { animation-delay: 600ms; }
      `}</style>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-2xl font-bold text-[#1e3a5f]">Medaliq</span>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#como-funciona" className="hover:text-[#1e3a5f] transition-colors">Cómo funciona</a>
            <a href="#entrenadores" className="hover:text-[#1e3a5f] transition-colors">Para entrenadores</a>
            <a href="/coaches" className="hover:text-[#1e3a5f] transition-colors">Coaches</a>
            <a href="#precios" className="hover:text-[#1e3a5f] transition-colors">Precios</a>
          </div>
          <a href="/onboarding">
            <Button className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-lg transition-transform hover:scale-105 active:scale-95">
              Empieza gratis
            </Button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1e3a5f] to-[#0f2240] text-white py-28 px-4 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />
        <div className="absolute bottom-[-60px] left-[-60px] w-60 h-60 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="flex flex-wrap justify-center gap-3 mb-8 anim-fade-up">
            <span className="bg-white/10 border border-white/20 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
              🔬 Basado en ciencia del deporte
            </span>
            <span className="bg-white/10 border border-white/20 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
              🌎 Para LatAm
            </span>
            <span className="bg-white/10 border border-white/20 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
              📈 Planes vivos, no PDFs
            </span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6 anim-fade-up delay-200">
            Tu coach de élite,{" "}
            <span className="text-[#f97316]">siempre disponible</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed anim-fade-up delay-300">
            Recompone tu cuerpo, alcanza tu meta en carrera o gestiona a tus atletas — con un AI que genera planes periodizados y los ajusta según tus datos reales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center anim-fade-up delay-400">
            <a href="/onboarding">
              <Button className="anim-pulse-cta bg-[#f97316] hover:bg-[#ea6c0a] text-white font-bold px-8 py-4 rounded-xl text-lg w-full sm:w-auto transition-transform hover:scale-105 active:scale-95">
                Crea tu plan gratis
              </Button>
            </a>
            <a href="#como-funciona">
              <Button
                variant="outline"
                className="border-white/30 text-white bg-white/10 hover:bg-white/20 font-semibold px-8 py-4 rounded-xl text-lg w-full sm:w-auto transition-transform hover:scale-105 active:scale-95 backdrop-blur-sm"
              >
                Ver cómo funciona
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16 anim-fade-in delay-600">
            {[
              { value: '18 sem', label: 'Plan máximo' },
              { value: '39+', label: 'Ejercicios' },
              { value: '24/7', label: 'AI Coach' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-extrabold text-[#f97316]">{value}</div>
                <div className="text-xs text-blue-300 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ¿Para quién es? */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#1e3a5f] mb-4">
              ¿Para quién es Medaliq?
            </h2>
            <p className="text-center text-gray-500 mb-12 text-base">Tres perfiles, un solo coach inteligente.</p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: '🏃',
                title: 'Atleta amateur',
                desc: 'Quieres bajar peso sin perder músculo, mejorar tu composición corporal y sentirte con más energía. Sin plantillas genéricas — un plan hecho para tu cuerpo y tu ritmo de vida.',
                delay: 0,
              },
              {
                emoji: '🚴',
                title: 'Corredor / ciclista',
                desc: 'Tienes una carrera en el horizonte y quieres llegar al día D en tu mejor forma. El AI construye tu plan de 12–20 semanas y lo ajusta según cómo vas respondiendo.',
                delay: 100,
              },
              {
                emoji: '📋',
                title: 'Entrenador profesional',
                desc: 'Gestionas varios atletas y el tiempo no alcanza. El AI hace el trabajo pesado de diseño y seguimiento — tú te enfocas en lo que realmente agrega valor: el criterio humano.',
                delay: 200,
              },
            ].map(({ emoji, title, desc, delay }) => (
              <RevealOnScroll key={title} delay={delay}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="text-4xl mb-4">{emoji}</div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#1e3a5f] mb-4">
              Cómo funciona
            </h2>
            <p className="text-center text-gray-500 mb-14 text-base">De cero a plan periodizado en minutos.</p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Cuéntanos tu objetivo", desc: "Un chat de intake personalizado recoge tu historial, metas, disponibilidad y limitaciones. Sin formularios aburridos.", delay: 0 },
              { step: "02", title: "Tu plan en minutos", desc: "El AI genera un plan periodizado por semanas adaptado a ti — carga progresiva, bloques de trabajo y recuperación.", delay: 100 },
              { step: "03", title: "Entrena con guía", desc: "Cada día tienes la sesión del día, recomendaciones de nutrición y carga ajustada a tu ritmo circadiano.", delay: 200 },
              { step: "04", title: "El plan se adapta", desc: "Check-in semanal → el AI analiza tus datos reales (peso, FC, sueño, adherencia) y actualiza el plan.", delay: 300 },
            ].map((item) => (
              <RevealOnScroll key={item.step} delay={item.delay}>
                <div className="flex flex-col gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-[#f97316] transition-colors duration-300">
                    {item.step}
                  </div>
                  <h3 className="text-base font-bold text-[#1e3a5f]">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* El coach que nunca da plantillas */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4 leading-tight">
              El coach que nunca te da plantillas genéricas
            </h2>
            <p className="text-gray-500 mb-8 text-base leading-relaxed">
              Medaliq analiza tus datos continuamente para darte el plan más inteligente — no el promedio.
            </p>
            <ul className="space-y-4">
              {[
                { icon: "🔍", text: "Detecta inconsistencias en tus datos antes de que te afecten" },
                { icon: "❤️", text: "Zonas de FC personalizadas, no las genéricas de internet" },
                { icon: "🥗", text: "Nutrición adaptada al tipo de sesión del día" },
                { icon: "⚠️", text: "Alertas automáticas de sobrecarga o bajo rendimiento" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 group">
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                  <span className="text-gray-700 text-sm leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
          </RevealOnScroll>

          {/* App Mockup */}
          <RevealOnScroll delay={150}>
            <div className="bg-[#1e3a5f] rounded-2xl p-6 text-white shadow-2xl anim-float">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest">Sesión de hoy</span>
                <span className="bg-[#f97316] text-white text-xs font-bold px-2 py-1 rounded-full">Zona 3</span>
              </div>
              <h4 className="text-lg font-bold mb-1">Intervalos 4×8 min</h4>
              <p className="text-blue-200 text-xs mb-6">Martes · Semana 7 de 18</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { value: '68', label: 'FC reposo' },
                  { value: '7.2h', label: 'Sueño' },
                  { value: '92%', label: 'Adherencia' },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-3 text-center hover:bg-white/15 transition-colors">
                    <div className="text-xl font-bold text-[#f97316]">{value}</div>
                    <div className="text-xs text-blue-200 mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-sm text-blue-100 leading-relaxed">
                <span className="text-[#f97316] font-semibold">Coach AI: </span>
                Tu FC reposo bajó 3 bpm esta semana — buena señal de recuperación. Mantén la intensidad de hoy.
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Para Entrenadores */}
      <section id="entrenadores" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <RevealOnScroll>
            <div className="inline-block bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
              Para entrenadores
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">
              Amplifica tu coaching con AI
            </h2>
            <p className="text-gray-500 mb-12 max-w-xl mx-auto text-base">
              El AI no te reemplaza — te libera del trabajo operativo para que puedas enfocarte en lo que realmente importa.
            </p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: "📊", title: "Dashboard unificado", desc: "Ve el estado de todos tus atletas en un solo lugar — carga, adherencia, alertas y próximas sesiones.", delay: 0 },
              { icon: "✅", title: "El AI genera, tú apruebas", desc: "Medaliq propone el plan. Tú lo revisas, ajustas con un clic y lo publicas. Tu criterio siempre manda.", delay: 100 },
              { icon: "🔔", title: "Alertas inteligentes", desc: "Recibe notificaciones cuando un atleta muestra señales de sobrecarga, bajo rendimiento o cambio en sus datos.", delay: 200 },
            ].map((item) => (
              <RevealOnScroll key={item.title} delay={item.delay}>
                <div className="bg-gray-50 rounded-2xl p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="text-base font-bold text-[#1e3a5f] mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
          <RevealOnScroll delay={200}>
            <a href="/onboarding">
              <Button className="bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold px-8 py-3 rounded-xl transition-transform hover:scale-105 active:scale-95">
                Soy entrenador →
              </Button>
            </a>
          </RevealOnScroll>
        </div>
      </section>

      {/* Coaches destacados */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">
                Elige tu coach o entrena con AI
              </h2>
              <p className="text-gray-500 text-base max-w-xl mx-auto">
                Coaches especializados en distintos deportes, o nuestro AI Coach disponible 24/7
              </p>
            </div>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* AI Coach card */}
            <RevealOnScroll>
              <div className="bg-[#1e3a5f] text-white rounded-2xl border-2 border-[#f97316] shadow-lg p-6 flex flex-col hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#f97316] flex items-center justify-center text-white font-extrabold text-base shrink-0 anim-pulse-cta">
                    AI
                  </div>
                  <div>
                    <div className="font-bold text-base leading-tight">Coach Inteligente Medaliq</div>
                    <div className="text-blue-200 text-xs">Disponible 24/7</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {["Running", "Gym", "Ciclismo", "Triatlón"].map((s) => (
                    <span key={s} className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5">{s}</span>
                  ))}
                </div>
                <p className="text-blue-100 text-sm mb-4 flex-1">
                  Planes personalizados · Ajuste automático semanal · Chat ilimitado
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-blue-200 text-sm">Desde <span className="text-white font-bold">$15</span>/mes</span>
                  <a href="/p/ai-coach">
                    <span className="bg-[#f97316] hover:bg-[#ea6c0a] text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors">
                      Ver perfil
                    </span>
                  </a>
                </div>
              </div>
            </RevealOnScroll>

            {/* Placeholder coach 1 */}
            <RevealOnScroll delay={100}>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-base shrink-0">CR</div>
                  <div>
                    <div className="font-bold text-[#1e3a5f] text-base leading-tight">Coach Running</div>
                    <div className="text-gray-400 text-xs">Especialista en media maratón</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">Running</span>
                  <span className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">Triatlón</span>
                </div>
                <p className="text-gray-400 text-sm mb-4 flex-1">Próximamente — coaches reales en tu deporte.</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-gray-400 text-sm">Próximamente</span>
                  <a href="/coaches"><span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-xl">Ver todos</span></a>
                </div>
              </div>
            </RevealOnScroll>

            {/* Placeholder coach 2 */}
            <RevealOnScroll delay={200}>
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-base shrink-0">CG</div>
                  <div>
                    <div className="font-bold text-[#1e3a5f] text-base leading-tight">Coach Gym</div>
                    <div className="text-gray-400 text-xs">Recomposición y fuerza</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">Gym</span>
                  <span className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">Funcional</span>
                </div>
                <p className="text-gray-400 text-sm mb-4 flex-1">Próximamente — coaches reales en tu deporte.</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-gray-400 text-sm">Próximamente</span>
                  <a href="/coaches"><span className="bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-xl">Ver todos</span></a>
                </div>
              </div>
            </RevealOnScroll>
          </div>
          <RevealOnScroll>
            <div className="text-center">
              <a href="/coaches" className="text-[#1e3a5f] font-semibold text-sm hover:underline">
                Ver todos los coaches →
              </a>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">Precios simples</h2>
            <p className="text-gray-500 mb-12 text-base">Sin sorpresas. Cancela cuando quieras.</p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <RevealOnScroll>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-left flex flex-col hover:shadow-md transition-shadow h-full">
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Free</span>
                  <div className="text-4xl font-extrabold text-[#1e3a5f] mt-2">$0</div>
                  <div className="text-gray-400 text-sm">para siempre</div>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-6">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Plan básico con 1 objetivo</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Intake conversacional</li>
                  <li className="flex items-center gap-2"><span className="text-gray-300">✗</span> AI chat continuo</li>
                  <li className="flex items-center gap-2"><span className="text-gray-300">✗</span> Integraciones (Garmin, etc.)</li>
                  <li className="flex items-center gap-2"><span className="text-gray-300">✗</span> Ajuste automático del plan</li>
                </ul>
                <a href="/onboarding">
                  <Button variant="outline" className="w-full border-gray-200 text-[#1e3a5f] hover:bg-gray-50 font-semibold">
                    Empezar gratis
                  </Button>
                </a>
              </div>
            </RevealOnScroll>

            {/* Pro */}
            <RevealOnScroll delay={100}>
              <div className="bg-[#1e3a5f] rounded-2xl p-6 border-2 border-[#f97316] shadow-xl text-left flex flex-col relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 h-full">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#f97316] text-white text-xs font-bold px-4 py-1 rounded-full">Más popular</span>
                </div>
                <div className="mb-4">
                  <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">Pro</span>
                  <div className="text-4xl font-extrabold text-white mt-2">$15</div>
                  <div className="text-blue-300 text-sm">por mes</div>
                </div>
                <ul className="space-y-3 text-sm text-blue-100 flex-1 mb-6">
                  <li className="flex items-center gap-2"><span className="text-[#f97316]">✓</span> Plan completo + periodización</li>
                  <li className="flex items-center gap-2"><span className="text-[#f97316]">✓</span> AI chat continuo</li>
                  <li className="flex items-center gap-2"><span className="text-[#f97316]">✓</span> Integración Garmin / Polar</li>
                  <li className="flex items-center gap-2"><span className="text-[#f97316]">✓</span> Ajuste automático semanal</li>
                  <li className="flex items-center gap-2"><span className="text-[#f97316]">✓</span> Nutrición por sesión</li>
                </ul>
                <a href="/onboarding">
                  <Button className="w-full bg-[#f97316] hover:bg-[#ea6c0a] text-white font-bold">
                    Empezar con Pro
                  </Button>
                </a>
              </div>
            </RevealOnScroll>

            {/* Coach */}
            <RevealOnScroll delay={200}>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-left flex flex-col hover:shadow-md transition-shadow h-full">
                <div className="mb-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Coach</span>
                  <div className="text-4xl font-extrabold text-[#1e3a5f] mt-2">$49</div>
                  <div className="text-gray-400 text-sm">por mes</div>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-6">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Hasta 20 atletas</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Dashboard de entrenador</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Override de planes</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Alertas de atletas</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Todo lo de Pro para cada atleta</li>
                </ul>
                <a href="/onboarding">
                  <Button variant="outline" className="w-full border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white font-semibold transition-colors">
                    Quiero ser Coach
                  </Button>
                </a>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#1e3a5f] to-[#0f2240] text-white text-center">
        <RevealOnScroll>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Empieza hoy — es gratis</h2>
          <p className="text-blue-200 mb-8 text-base max-w-md mx-auto">Tu plan personalizado en menos de 5 minutos. Sin tarjeta de crédito.</p>
          <a href="/onboarding">
            <Button className="bg-[#f97316] hover:bg-[#ea6c0a] text-white font-bold px-10 py-4 rounded-xl text-lg transition-transform hover:scale-105 active:scale-95 anim-pulse-cta">
              Crear mi plan gratis
            </Button>
          </a>
        </RevealOnScroll>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-blue-200 py-10 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-xl font-extrabold text-white">Medaliq</span>
            <span className="text-sm text-blue-300">Hecho para LatAm 🌎</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="/terminos" className="hover:text-white transition-colors">Términos</a>
            <a href="/privacidad" className="hover:text-white transition-colors">Privacidad</a>
            <a href="mailto:hola@medaliq.com" className="hover:text-white transition-colors">hola@medaliq.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
