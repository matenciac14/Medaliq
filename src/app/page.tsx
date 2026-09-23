/** @format */

import RevealOnScroll from "./_components/RevealOnScroll";
import ROICalculator from "./_components/ROICalculator";
import { allTranslations } from "@/lib/i18n";
import ProfileTabs from "./_components/ProfileTabs";
import { JsonLd } from "@/components/seo/json_ld";
import {
  Activity,
  Flame,
  CalendarCheck,
  Wallet,
  FileSpreadsheet,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  Smartphone,
  HeartPulse,
  Apple,
  ClipboardCheck,
  LayoutDashboard,
  Users,
  List,
  CreditCard,
  MessageCircle,
  Search,
  FlaskConical,
  Globe,
  BadgePercent,
} from "lucide-react";

export default function Home() {
  // Landing siempre en español — idioma del producto (BUG-045)
  const t = allTranslations['es'];
  const l = t.landing;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Medaliq',
        url: 'https://medaliq.com',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Web, iOS, Android',
        description: 'Plataforma de tracking y coaching deportivo para entrenadores y atletas en Latinoamerica. Planes periodizados, nutricion personalizada con Mifflin-St Jeor, zonas de frecuencia cardiaca con Karvonen y seguimiento semanal.',
        offers: [
          { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free', description: 'Dashboard, log de entrenamientos, registro de nutricion y ejercicios — gratis para siempre.' },
          { '@type': 'Offer', price: '9.99', priceCurrency: 'USD', name: 'Pro', description: 'Check-in semanal con sugerencias de ajuste, nutricion personalizada diaria, metricas de progreso y tracker de ejercicios.' },
        ],
        /* aggregateRating removed — no real user reviews yet. Re-add when we have verified ratings. */
        featureList: 'Planes periodizados, Zonas de FC con Karvonen, TDEE y macros con Mifflin-St Jeor, Nutricion adaptada por sesion, Check-in semanal, Panel multi-atleta para coaches, Gestion de cobros, Codigo de invitacion',
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'Mis atletas de verdad lo van a usar?', acceptedAnswer: { '@type': 'Answer', text: 'Si. Entran desde su celular o navegador, como cualquier app — sin instalar nada complicado. Tu los invitas con tu codigo.' } },
          { '@type': 'Question', name: 'Mis atletas tambien pagan?', acceptedAnswer: { '@type': 'Answer', text: 'No. Tu pagas tu plan de coach (o empiezas gratis con hasta 5 asesorados). Ellos usan su app sin costo extra.' } },
          { '@type': 'Question', name: 'Como subo lo que ya tengo?', acceptedAnswer: { '@type': 'Answer', text: 'Invitas a tus atletas con tu codigo unico y suben su perfil en minutos. Te ayudamos a cargar los primeros.' } },
          { '@type': 'Question', name: 'Y si no me sirve?', acceptedAnswer: { '@type': 'Answer', text: 'Cancela cuando quieras — sin letra chica, sin permanencia.' } },
          { '@type': 'Question', name: 'Que es Medaliq?', acceptedAnswer: { '@type': 'Answer', text: 'Medaliq es una plataforma de tracking y coaching deportivo para Latinoamerica. Permite a entrenadores gestionar sus atletas con planes periodizados, nutricion personalizada y seguimiento semanal desde un solo panel. Los atletas registran sesiones, nutricion y ejercicios desde la app.' } },
          { '@type': 'Question', name: 'Cuanto cuesta Medaliq para coaches?', acceptedAnswer: { '@type': 'Answer', text: 'Medaliq tiene 4 planes para coaches: Starter (gratis, hasta 5 atletas), Growth ($39/mes, 6-25 atletas), Pro ($79/mes, 26-75 atletas) y Scale ($129/mes, +75 atletas). 0% de fee sobre pagos de atletas.' } },
        ],
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Medaliq',
        url: 'https://medaliq.com',
        logo: 'https://medaliq.com/brand/png/apple-touch-icon-180.png',
        description: 'Plataforma de tracking y coaching deportivo para Latinoamerica.',
        foundingDate: '2025',
        areaServed: { '@type': 'Place', name: 'Latin America' },
        contactPoint: { '@type': 'ContactPoint', email: 'hola@medaliq.com', contactType: 'customer support' },
        sameAs: [],
      }} />
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

      {/* 1 · Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <svg width="28" height="28" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="120" height="120" rx="24" fill="#1e3a5f"/>
              <polygon points="60,26 92,58 74,58 60,44 46,58 28,58" fill="#ea580c"/>
              <polygon points="60,58 92,90 74,90 60,76 46,90 28,90" fill="#f7f6f4"/>
            </svg>
            <span className="text-xl font-extrabold text-[#1e3a5f] tracking-tight">Medal<span className="text-[#c2410c]">IQ</span></span>
          </a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#como-funciona" className="hover:text-[#1e3a5f] transition-colors">{l.nav.howItWorks}</a>
            <a href="#precios" className="hover:text-[#1e3a5f] transition-colors">{l.nav.pricing}</a>
            <a href="#entrenadores" className="hover:text-[#1e3a5f] transition-colors">{l.nav.forTrainers}</a>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <a href="/login" className="inline-block bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-semibold rounded-lg transition-transform hover:scale-105 active:scale-95 whitespace-nowrap text-xs px-3 py-2 sm:text-sm sm:px-5">
              <span className="sm:hidden">Reservar</span>
              <span className="hidden sm:inline">{l.nav.cta}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* 2 · Hero */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "680px" }}
      >
        <img
          src="/hero-coach.jpg"
          alt="Coach con atleta"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(15,34,64,0.95) 0%, rgba(30,58,95,0.75) 45%, rgba(30,58,95,0.25) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 60%, rgba(15,34,64,0.4) 100%)",
          }}
        />

        {/* Floating card mobile — relativo a <section>, no al inner div */}
        <div className="lg:hidden absolute top-[50px] right-4 z-20 anim-fade-in delay-400">
          <div className="bg-white/12 border border-white/20 backdrop-blur-sm rounded-[14px] px-[10px] py-[5px] flex flex-col gap-[1px] w-[180px] shadow-[0px_12px_30px_-6px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ea580c]" />
              <span className="text-[#bfdbfe] text-[10px] font-semibold uppercase">
                Sesión de hoy
              </span>
            </div>
            <p className="text-white text-sm  font-bold whitespace-nowrap">
              Intervalos 4×8 · Zona 3
            </p>
            <p className="text-[#bfdbfe] text-xs whitespace-nowrap">
              Adherencia 92% · FC ↓3bpm
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-16 pt-[110px] pb-14 sm:py-24 lg:py-36 flex items-center gap-12 min-h-[680px]">
          <div className="w-full lg:max-w-[580px]">
            <div className="flex flex-wrap gap-2 mb-7 anim-fade-up">
              {(
                [
                  { Icon: FlaskConical, label: l.hero.badge1 },
                  { Icon: Globe, label: l.hero.badge2 },
                  { Icon: BadgePercent, label: l.hero.badge3 },
                ] as { Icon: React.ElementType; label: string }[]
              ).map(({ Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-[5px] bg-white/[0.14] text-white font-medium px-[10px] py-[5px] rounded-full backdrop-blur-sm"
                >
                  <Icon size={14} strokeWidth={2} className="shrink-0" />
                  <span className="text-xs">{label}</span>
                </span>
              ))}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold leading-[1.06] tracking-[-0.02em] text-white mb-5 anim-fade-up delay-100">
              {l.hero.title}{" "}
              <span className="text-[#ea580c]">{l.hero.titleHighlight}</span>
            </h1>
            <p className="text-lg text-[#dbeafe] leading-[1.5] mb-8 max-w-lg anim-fade-up delay-200">
              {l.hero.subtitle}
            </p>
            <div className="flex flex-col items-start gap-3 anim-fade-up delay-300">
              <a href="/login" className="block w-full sm:w-auto anim-pulse-cta bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-semibold text-sm sm:font-bold sm:text-lg px-9 py-[12px] sm:py-4 rounded-xl transition-transform hover:scale-105 active:scale-95 text-center">
                {l.hero.cta1}
              </a>
              <a
                href="#como-funciona"
                className="hidden sm:inline text-blue-300 hover:text-white text-sm transition-colors"
              >
                {l.hero.cta2}
              </a>
              <div className="flex items-center gap-2 mt-1 anim-fade-in delay-500">
                <span className="text-[#ea580c] text-xs">★★★★★</span>
                <span className="text-blue-200 text-xs">Coaches en LatAm ya reservaron su lugar</span>
              </div>
            </div>
          </div>

          {/* Floating cards desktop */}
          <div className="hidden lg:flex flex-col gap-4 ml-auto anim-fade-in delay-400">
            <div className="bg-white/12 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-3.5 flex items-center gap-3 anim-float">
              <div className="w-7 h-7 rounded-full bg-[rgba(52,211,153,0.22)] flex items-center justify-center shrink-0">
                <span className="text-[#34d399] font-bold text-sm">✓</span>
              </div>
              <div>
                <p className="text-white text-xs font-semibold">
                  Pago confirmado
                </p>
                <p className="text-blue-200 text-xs">
                  Ana G. · $180.000 COP
                </p>
              </div>
            </div>
            <div className="bg-white/12 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#ea580c]" />
                <span className="text-[#bfdbfe] text-[10px] font-semibold uppercase">
                  Sesión de hoy
                </span>
              </div>
              <p className="text-white text-sm font-bold">
                Intervalos 4×8 · Zona 3
              </p>
              <p className="text-[#bfdbfe] text-xs whitespace-nowrap">
                Adherencia 92% · FC ↓3bpm
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2b · Franja científica */}
      <section className="bg-white border-b border-gray-100 py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-7">
          <p className="text-gray-400 text-xs font-semibold tracking-[0.12em] uppercase text-center">
            <span className="sm:hidden">Respaldado por ciencia real</span>
            <span className="hidden sm:inline">{l.science.label}</span>
          </p>
          {/* Desktop: fila dividida con divide-x */}
          <div className="hidden sm:flex items-center divide-x divide-gray-200 w-full">
            {[
              {
                icon: <Activity size={22} />,
                title: l.science.item1Title,
                sub: l.science.item1Sub,
              },
              {
                icon: <Flame size={22} />,
                title: l.science.item2Title,
                sub: l.science.item2Sub,
              },
              {
                icon: <CalendarCheck size={22} />,
                title: l.science.item3Title,
                sub: l.science.item3Sub,
              },
              {
                icon: <Wallet size={22} />,
                title: l.science.item4Title,
                sub: l.science.item4Sub,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 flex-1 px-8 first:pl-0 last:pr-0"
              >
                <span className="text-[#ea580c] shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[#1e3a5f] text-sm font-bold leading-tight">
                    {item.title}
                  </p>
                  <p className="text-gray-500 text-xs">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Mobile: grid 2×2 */}
          <div className="grid grid-cols-2 gap-6 sm:hidden w-full">
            {[
              {
                icon: <Activity size={20} />,
                title: l.science.item1Title,
                sub: l.science.item1Sub,
              },
              {
                icon: <Flame size={20} />,
                title: l.science.item2Title,
                sub: l.science.item2Sub,
              },
              {
                icon: <CalendarCheck size={20} />,
                title: l.science.item3Title,
                sub: l.science.item3Sub,
              },
              {
                icon: <Wallet size={20} />,
                title: l.science.item4Title,
                sub: l.science.item4Sub,
              },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="text-[#ea580c] shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[#1e3a5f] text-sm font-bold leading-tight">
                    {item.title}
                  </p>
                  <p className="text-gray-500 text-xs">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2c · El caos de hoy */}
      <section className="py-12 sm:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4 max-w-2xl mx-auto leading-tight">
              {l.pain.title}
            </h2>
            <p className="text-gray-500 text-base mb-8 sm:mb-12">{l.pain.subtitle}</p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-10">
            {[
              {
                icon: <FileSpreadsheet size={20} />,
                title: l.pain.card1Title,
                desc: l.pain.card1Desc,
                delay: 0,
              },
              {
                icon: <MessageSquare size={20} />,
                title: l.pain.card2Title,
                desc: l.pain.card2Desc,
                delay: 100,
              },
              {
                icon: <AlertTriangle size={20} />,
                title: l.pain.card3Title,
                desc: l.pain.card3Desc,
                delay: 200,
              },
            ].map((card) => (
              <RevealOnScroll key={card.title} delay={card.delay}>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 sm:p-6 text-left h-full">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-4 text-red-400">
                    {card.icon}
                  </div>
                  <h3 className="text-[#1e3a5f] font-bold text-[17px] mb-2">
                    {card.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
          <RevealOnScroll delay={150}>
            <div className="inline-flex items-center gap-2 bg-[#1e3a5f]/06 px-6 py-3.5 rounded-full">
              <p className="text-[#1e3a5f] font-semibold text-base">
{l.pain.bridge}
              </p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* 3 · Profiles */}
      <section className="py-12 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#1e3a5f] mb-4">
              {l.profiles.title}
            </h2>
            <p className="text-center text-gray-500 mb-8 sm:mb-12 text-base">
              {l.profiles.subtitle}
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <ProfileTabs
              ctaLabel={l.hero.cta1}
              tabs={[
                {
                  label: l.profiles.tab2Label,
                  title: l.profiles.tab2Title,
                  desc: l.profiles.tab2Desc,
                  gets: l.profiles.tab2Gets,
                },
                {
                  label: l.profiles.tab1Label,
                  title: l.profiles.tab1Title,
                  desc: l.profiles.tab1Desc,
                  gets: l.profiles.tab1Gets,
                },
              ]}
            />
          </RevealOnScroll>
        </div>
      </section>

      {/* 4 · Para Entrenadores */}
      <section id="entrenadores" className="py-12 sm:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-block bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
                {l.forCoaches.badge}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4 max-w-2xl mx-auto leading-tight">
                {l.forCoaches.title}
              </h2>
              <p className="text-gray-500 text-base max-w-xl mx-auto">
                {l.forCoaches.subtitle}
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 mb-8 sm:mb-12">
            {[
              {
                icon: <TrendingUp size={22} />,
                title: l.forCoaches.card1Title,
                desc: l.forCoaches.card1Desc,
                delay: 0,
              },
              {
                icon: <Smartphone size={22} />,
                title: l.forCoaches.card2Title,
                desc: l.forCoaches.card2Desc,
                delay: 100,
              },
              {
                icon: <Wallet size={22} />,
                title: l.forCoaches.card3Title,
                desc: l.forCoaches.card3Desc,
                delay: 200,
              },
            ].map((card) => (
              <RevealOnScroll key={card.title} delay={card.delay}>
                <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 text-left h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-[rgba(249,115,22,0.12)] flex items-center justify-center mb-4 text-[#ea580c]">
                    {card.icon}
                  </div>
                  <h3 className="text-base font-bold text-[#1e3a5f] mb-2">
                    {card.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          {/* Coach panel mockup — mobile simplificado */}
          <RevealOnScroll delay={100}>
            <div className="md:hidden bg-[#1e3a5f] rounded-2xl p-5 mb-10">
              <p className="text-blue-300 text-[10px] font-semibold uppercase tracking-widest mb-4">
                Mis atletas · Vista resumen
              </p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { v: "22", label: "Atletas activos" },
                  { v: "18", label: "Al día" },
                  { v: "$2.4M", label: "Ingresos/mes" },
                  { v: "92%", label: "Adherencia" },
                ].map(({ v, label }) => (
                  <div key={label} className="bg-white/10 rounded-xl p-3">
                    <div className="text-lg font-extrabold text-[#ea580c]">
                      {v}
                    </div>
                    <div className="text-[10px] text-blue-300 mt-0.5">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  {
                    initials: "AG",
                    color: "#ea580c",
                    bg: "rgba(249,115,22,0.2)",
                    name: "Ana García",
                    sport: "Running",
                    pct: 92,
                  },
                  {
                    initials: "LM",
                    color: "#22c55e",
                    bg: "rgba(34,197,94,0.2)",
                    name: "Laura Méndez",
                    sport: "Running",
                    pct: 88,
                  },
                  {
                    initials: "JR",
                    color: "#8b5cf6",
                    bg: "rgba(139,92,246,0.2)",
                    name: "Javier Ruiz",
                    sport: "Fuerza",
                    pct: 95,
                  },
                ].map(({ initials, color, bg, name, sport, pct }) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 bg-white/8 rounded-xl px-3 py-2.5"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: bg, color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">
                        {name}
                      </p>
                      <p className="text-blue-300 text-[10px]">{sport}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-16 bg-white/20 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-[#ea580c]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#ea580c] font-semibold">
                        {pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          {/* Coach panel mockup — desktop */}
          <RevealOnScroll delay={100}>
            <div className="hidden md:block rounded-2xl overflow-hidden shadow-[0px_28px_56px_-14px_rgba(0,0,0,0.18)] border border-gray-200 mb-10">
              {/* Browser bar */}
              <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-3">
                <div className="flex gap-1.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 max-w-xs mx-auto bg-white rounded-md px-3 py-1 text-xs text-gray-500 text-center">
                  🔒 medaliq.com/coach/dashboard
                </div>
              </div>

              {/* App */}
              <div className="flex" style={{ height: "380px" }}>
                {/* Sidebar */}
                <div className="w-48 bg-[#1e3a5f] shrink-0 flex flex-col py-4">
                  <span className="text-white font-extrabold text-base px-4 mb-5">
                    Medaliq
                  </span>
                  <div className="bg-[rgba(249,115,22,0.18)] mx-2 rounded-lg px-3 py-2 flex items-center gap-2.5 mb-1">
                    <LayoutDashboard
                      size={15}
                      className="text-[#ea580c] shrink-0"
                    />
                    <span className="text-white text-xs font-semibold">
                      Dashboard
                    </span>
                  </div>
                  {[
                    { icon: <Users size={15} />, label: "Atletas" },
                    { icon: <List size={15} />, label: "Planes" },
                    { icon: <CreditCard size={15} />, label: "Pagos" },
                    { icon: <MessageCircle size={15} />, label: "Mensajes" },
                  ].map(({ icon, label }) => (
                    <div
                      key={label}
                      className="mx-2 px-3 py-2 flex items-center gap-2.5 rounded-lg"
                    >
                      <span className="text-blue-300 shrink-0">{icon}</span>
                      <span className="text-blue-200 text-xs">{label}</span>
                    </div>
                  ))}
                  {/* Coach profile */}
                  <div className="mt-auto mx-2 px-3 py-2 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#ea580c] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                      CM
                    </div>
                    <div>
                      <p className="text-white text-xs font-semibold leading-tight">
                        Carlos M.
                      </p>
                      <p className="text-blue-300 text-[10px]">
                        Coach · Running
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main content */}
                <div className="flex-1 bg-gray-50 p-5 overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h4 className="text-sm font-bold text-[#1e3a5f]">
                        Mis atletas
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        22 activos · 4 pendientes de pago
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                        <Search size={11} className="text-gray-400" />
                        <span className="text-gray-400 text-[10px]">
                          Buscar atleta...
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 my-3">
                    {[
                      { v: "22", label: "Atletas activos" },
                      { v: "18", label: "Al día" },
                      { v: "$2.4M", label: "Ingresos/mes (COP)" },
                      { v: "92%", label: "Adherencia prom." },
                    ].map(({ v, label }) => (
                      <div
                        key={label}
                        className="bg-white rounded-xl p-2.5 border border-gray-100"
                      >
                        <div className="text-sm font-extrabold text-[#1e3a5f]">
                          {v}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_80px_70px_100px_80px] gap-2 px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    <span>Atleta</span>
                    <span>Deporte</span>
                    <span>Plan</span>
                    <span>Adherencia</span>
                    <span>Pago</span>
                  </div>

                  {/* Rows */}
                  <div className="space-y-1">
                    {[
                      {
                        initials: "AG",
                        color: "#ea580c",
                        bg: "rgba(249,115,22,0.15)",
                        name: "Ana García",
                        sport: "Running",
                        plan: "Sem 7/12",
                        pct: 92,
                        paid: true,
                      },
                      {
                        initials: "CL",
                        color: "#ea580c",
                        bg: "rgba(249,115,22,0.15)",
                        name: "Carlos López",
                        sport: "Fuerza",
                        plan: "Sem 3/12",
                        pct: 78,
                        paid: false,
                      },
                      {
                        initials: "LM",
                        color: "#22c55e",
                        bg: "rgba(34,197,94,0.15)",
                        name: "Laura Méndez",
                        sport: "Running",
                        plan: "Sem 10/12",
                        pct: 88,
                        paid: true,
                      },
                      {
                        initials: "JR",
                        color: "#8b5cf6",
                        bg: "rgba(139,92,246,0.15)",
                        name: "Javier Ruiz",
                        sport: "Fuerza",
                        plan: "Sem 5/12",
                        pct: 95,
                        paid: true,
                      },
                      {
                        initials: "MT",
                        color: "#f59e0b",
                        bg: "rgba(245,158,11,0.15)",
                        name: "María Torres",
                        sport: "Running",
                        plan: "Sem 2/8",
                        pct: 70,
                        paid: false,
                      },
                    ].map(
                      ({
                        initials,
                        color,
                        bg,
                        name,
                        sport,
                        plan,
                        pct,
                        paid,
                      }) => (
                        <div
                          key={name}
                          className="grid grid-cols-[1fr_80px_70px_100px_80px] gap-2 items-center bg-white rounded-xl px-3 py-2 border border-gray-50"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: bg, color }}
                            >
                              {initials}
                            </div>
                            <span className="text-xs text-gray-700 font-medium truncate">
                              {name}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {sport}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {plan}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${pct >= 88 ? "bg-green-500" : pct >= 75 ? "bg-orange-400" : "bg-orange-400"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span
                              className={`text-[10px] font-semibold ${pct >= 88 ? "text-green-600" : "text-orange-600"}`}
                            >
                              {pct}%
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-center ${paid ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}
                          >
                            {paid ? "Pagado" : "Pendiente"}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={150}>
            <div className="text-center">
              <a href="/login" className="inline-block bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-semibold px-8 py-3 rounded-xl transition-transform hover:scale-105 active:scale-95 text-center">
                {l.forCoaches.cta}
              </a>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* 4b · Herramientas para coaches */}
      <section className="py-12 sm:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll>
            <div className="text-center mb-8 sm:mb-14">
              <span className="inline-block bg-[#1e3a5f]/8 text-[#1e3a5f] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-4">
                Herramientas para coaches
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">
                Todo lo que necesitas. Nada que no uses.
              </h2>
              <p className="text-gray-500 text-base max-w-xl mx-auto">
                Diseñado para entrenadores que llevan atletas reales — no para hacer burocracia.
              </p>
            </div>
          </RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <FileSpreadsheet size={22} />, title: 'Constructor de planes', desc: 'Crea planes periodizados semana a semana. Asigna sesiones, zonas y notas por día.' },
              { icon: <Users size={22} />, title: 'Panel multi-atleta', desc: 'Todos tus asesorados en una vista. Cumplimiento, alertas y pendientes en tiempo real.' },
              { icon: <Activity size={22} />, title: 'Rutinas de gym', desc: 'Diseña rutinas de fuerza y asígnalas a cada atleta. Ejercicios, series y progresión incluidos.' },
              { icon: <Wallet size={22} />, title: 'Gestión de cobros', desc: 'Registra honorarios y pagos por atleta. Sin apps externas, sin planillas.' },
              { icon: <MessageSquare size={22} />, title: 'Notas por sesión', desc: 'Deja instrucciones específicas para cada sesión. Tu atleta las ve en la app antes de entrenar.' },
              { icon: <TrendingUp size={22} />, title: 'Alertas de progreso', desc: 'Recibe alertas cuando un atleta no cumple su plan o su adherencia baja semana a semana.' },
            ].map((item) => (
              <RevealOnScroll key={item.title}>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-[#1e3a5f]/4 transition-colors border border-gray-100 hover:border-[#1e3a5f]/15">
                  <div className="w-10 h-10 rounded-xl bg-[#ea580c]/10 flex items-center justify-center shrink-0 text-[#ea580c]">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1e3a5f] text-sm mb-1">{item.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 5 · Features */}
      <section className="py-12 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4 leading-tight">
              {l.features.title}
            </h2>
            <p className="text-gray-500 mb-8 text-base leading-relaxed">
              {l.features.subtitle}
            </p>
            <ul className="space-y-5">
              {[
                { icon: <HeartPulse size={20} />, text: l.features.item1 },
                { icon: <Flame size={20} />, text: l.features.item2 },
                { icon: <Apple size={20} />, text: l.features.item3 },
                { icon: <ClipboardCheck size={20} />, text: l.features.item4 },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <span className="text-[#ea580c] shrink-0 mt-0.5">
                    {item.icon}
                  </span>
                  <span className="text-gray-700 text-sm leading-relaxed">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </RevealOnScroll>

          <RevealOnScroll delay={150}>
            <div className="bg-[#1e3a5f] rounded-2xl p-6 text-white shadow-2xl anim-float">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-semibold text-blue-200 uppercase tracking-widest">
                  {l.features.sessionLabel}
                </span>
                <span className="bg-[#ea580c] text-white text-xs font-bold px-2 py-1 rounded-full">
                  Zona 3
                </span>
              </div>
              <h4 className="text-lg font-bold mb-1">
                {l.features.sessionTitle}
              </h4>
              <p className="text-blue-200 text-xs mb-6">
                Martes · {l.features.weekLabel}
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { value: "68", label: "FC reposo" },
                  { value: "7.2h", label: "Sueño" },
                  { value: "92%", label: "Adherencia" },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="bg-white/10 rounded-xl p-3 text-center"
                  >
                    <div className="text-xl font-bold text-[#ea580c]">
                      {value}
                    </div>
                    <div className="text-xs text-blue-200 mt-1">{label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-sm text-blue-100 leading-relaxed">
                <span className="text-[#ea580c] font-semibold">Resumen: </span>
                {l.features.summaryMsg}
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* 6 · Cómo funciona */}
      <section id="como-funciona" className="py-12 sm:py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#1e3a5f] mb-4">
              {l.howItWorks.title}
            </h2>
            <p className="text-center text-gray-500 mb-8 sm:mb-14 text-base">
              {l.howItWorks.subtitle}
            </p>
          </RevealOnScroll>
          <div className="flex flex-col gap-0">
            {[
              {
                step: "1",
                title: l.howItWorks.step1Title,
                desc: l.howItWorks.step1Desc,
                delay: 0,
              },
              {
                step: "2",
                title: l.howItWorks.step2Title,
                desc: l.howItWorks.step2Desc,
                delay: 120,
              },
              {
                step: "3",
                title: l.howItWorks.step3Title,
                desc: l.howItWorks.step3Desc,
                delay: 240,
              },
            ].map((item, idx) => (
              <RevealOnScroll key={item.step} delay={item.delay}>
                <div className="flex gap-5 group">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-sm font-bold group-hover:bg-[#ea580c] transition-colors duration-300 z-10">
                      {item.step}
                    </div>
                    {idx < 2 && (
                      <div
                        className="w-0.5 flex-1 bg-gradient-to-b from-[#1e3a5f]/30 to-transparent my-1"
                        style={{ minHeight: "2.5rem" }}
                      />
                    )}
                  </div>
                  <div className="pb-8">
                    <h3 className="text-base font-bold text-[#1e3a5f] mt-2 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* 6b · Flujo atleta B2C */}
      <section className="py-12 sm:py-20 px-4 bg-[#1e3a5f]">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                ¿Sin entrenador? Medaliq también es para ti.
              </h2>
              <p className="text-blue-200 text-base max-w-xl mx-auto">
                Registra tus entrenamientos, controla tu nutrición y mejora semana a semana — a tu ritmo.
              </p>
            </div>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RevealOnScroll>
              <div className="bg-white/8 border border-white/15 rounded-2xl p-7 flex flex-col h-full">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full mb-5 w-fit">
                  <span className="text-white text-xs font-semibold">Gratis · Para siempre</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-3">Empieza a registrar hoy</h3>
                <ul className="space-y-3 text-blue-200 text-sm flex-1">
                  {[
                    'Log de sesiones de running y ejercicios',
                    'Registro de nutrición diaria',
                    'Historial de entrenamientos',
                    'Sin tarjeta, sin compromiso',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-[#34d399] shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <a href="/login" className="block mt-6 w-full py-3 rounded-xl border border-white/30 text-white hover:bg-white/10 font-semibold transition-colors text-sm text-center">
                  Crear cuenta gratis →
                </a>
              </div>
            </RevealOnScroll>
            <RevealOnScroll delay={100}>
              <div className="bg-white/8 border border-[#ea580c]/40 rounded-2xl p-7 flex flex-col h-full">
                <div className="inline-flex items-center gap-2 bg-[#ea580c]/20 px-3 py-1 rounded-full mb-5 w-fit">
                  <span className="text-[#ea580c] text-xs font-bold">Pro · $9.99/mes</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-3">Con estructura real</h3>
                <ul className="space-y-3 text-blue-200 text-sm flex-1">
                  {[
                    'Plan periodizado con zonas de FC personalizadas',
                    'Nutrición diferente cada día según la sesión',
                    'Check-in semanal con sugerencias de ajuste',
                    'Métricas de progreso y detección de PRs',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-[#ea580c] shrink-0">✓</span>{f}
                    </li>
                  ))}
                </ul>
                <a href="/login" className="block mt-6 w-full py-3 rounded-xl bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-bold transition-transform hover:scale-105 active:scale-95 text-sm anim-pulse-cta text-center">
                  Probar Pro gratis →
                </a>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* 7b · Testimonios */}
      <section className="py-12 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">
              {l.testimonials.title}
            </h2>
            <p className="text-gray-500 text-base mb-8 sm:mb-12">
              {l.testimonials.subtitle}
            </p>
          </RevealOnScroll>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: l.testimonials.t1Quote,
                name: l.testimonials.t1Name,
                role: l.testimonials.t1Role,
                initials: "AM",
                color: "#1e3a5f",
                bg: "rgba(30,58,95,0.15)",
                delay: 0,
              },
              {
                quote: l.testimonials.t2Quote,
                name: l.testimonials.t2Name,
                role: l.testimonials.t2Role,
                initials: "VR",
                color: "#ea580c",
                bg: "rgba(249,115,22,0.15)",
                delay: 100,
              },
              {
                quote: l.testimonials.t3Quote,
                name: l.testimonials.t3Name,
                role: l.testimonials.t3Role,
                initials: "ST",
                color: "#8b5cf6",
                bg: "rgba(139,92,246,0.15)",
                delay: 200,
              },
            ].map((testimonial) => (
              <RevealOnScroll key={testimonial.name} delay={testimonial.delay}>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 text-left flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-[#ea580c] font-bold text-sm mb-3">★★★★★</p>
                  <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-5">
                    {testimonial.quote}
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{
                        background: testimonial.bg,
                        color: testimonial.color,
                      }}
                    >
                      {testimonial.initials}
                    </div>
                    <div>
                      <p className="text-[#1e3a5f] font-bold text-sm">
                        {testimonial.name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-10 sm:py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <RevealOnScroll>
            <ROICalculator />
          </RevealOnScroll>
        </div>
      </section>

      {/* 7 · Pricing */}
      <section id="precios" className="py-12 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto text-center">
          <RevealOnScroll>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-4">
              {l.pricing.title}
            </h2>
            <p className="text-gray-500 mb-3 text-base">{l.pricing.subtitle}</p>
            <span className="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1 rounded-full mb-10 tracking-widest uppercase">
              💵 Precios en USD
            </span>
          </RevealOnScroll>

          {/* Coach tiers */}
          <RevealOnScroll>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow p-6 md:p-8 text-left mb-6">
              <div className="mb-5">
                <div className="inline-block bg-[#1e3a5f]/10 text-[#1e3a5f] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-widest mb-2">
                  {l.pricing.forCoachesLabel}
                </div>
                <h3 className="text-lg font-bold text-[#1e3a5f] mb-1">
                  {l.pricing.coachTiersTitle}
                </h3>
                <p className="text-sm text-gray-500">
                  {l.pricing.coachTiersSubtitle}
                </p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                  {
                    name: "STARTER",
                    price: "Gratis",
                    athletes: "≤ 5 asesorados",
                    highlight: false,
                  },
                  {
                    name: "GROWTH",
                    price: "$39/mes",
                    athletes: "6 – 25 asesorados",
                    highlight: true,
                  },
                  {
                    name: "PRO",
                    price: "$79/mes",
                    athletes: "26 – 75 asesorados",
                    highlight: false,
                  },
                  {
                    name: "SCALE",
                    price: "$129/mes",
                    athletes: "+75 asesorados",
                    highlight: false,
                  },
                ].map((tier) => (
                  <div
                    key={tier.name}
                    className={`relative rounded-xl p-4 text-center border ${tier.highlight ? "bg-[rgba(249,115,22,0.06)] border-[#ea580c]" : "bg-gray-50 border-gray-100"}`}
                  >
                    {tier.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="bg-[#ea580c] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                          MÁS POPULAR
                        </span>
                      </div>
                    )}
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
                      {tier.name}
                    </div>
                    <div className="text-xl font-extrabold text-[#1e3a5f] mb-1">
                      {tier.price}
                    </div>
                    <div className="text-xs text-gray-500">{tier.athletes}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6">
                  {[
                    l.pricing.coachF1,
                    l.pricing.coachF2,
                    l.pricing.coachF3,
                    l.pricing.coachF4,
                    l.pricing.coachF5,
                  ].map((f) => (
                    <div
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <span className="text-green-500 shrink-0">✓</span> {f}
                    </div>
                  ))}
                </div>
                <div className="shrink-0">
                  <a href="/login" className="inline-block border border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white font-semibold transition-colors whitespace-nowrap px-6 py-2.5 rounded-lg text-center">
                    {l.pricing.coachCta}
                  </a>
                </div>
              </div>
            </div>
          </RevealOnScroll>

          <div className="flex items-center gap-4 max-w-2xl mx-auto mb-8">
            <hr className="flex-1 border-gray-200" />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
              Para atletas
            </span>
            <hr className="flex-1 border-gray-200" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <RevealOnScroll>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-left flex flex-col hover:shadow-md transition-shadow h-full">
                <div className="mb-5">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    {l.pricing.freeLabel}
                  </span>
                  <div className="text-4xl font-extrabold text-[#1e3a5f] mt-2">
                    $0{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      USD
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm">
                    {l.pricing.freePeriod}
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-600 flex-1 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {l.pricing.freeF1}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span> {l.pricing.freeF2}
                  </li>
                  <li className="flex items-center gap-2 text-gray-300">
                    <span>✗</span> {l.pricing.freeF3}
                  </li>
                  <li className="flex items-center gap-2 text-gray-300">
                    <span>✗</span> {l.pricing.freeF4}
                  </li>
                  <li className="flex items-center gap-2 text-gray-300">
                    <span>✗</span> {l.pricing.freeF5}
                  </li>
                </ul>
                <a href="/login" className="block w-full py-2.5 rounded-lg border border-gray-200 text-[#1e3a5f] hover:bg-gray-50 font-semibold text-sm transition-colors text-center">
                  {l.pricing.freeCta}
                </a>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={80}>
              <div
                className="rounded-2xl p-6 border-2 border-[#ea580c] shadow-xl text-left flex flex-col relative hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 h-full"
                style={{
                  background:
                    "linear-gradient(135deg, #1e3a5f 0%, #0f2240 100%)",
                }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="bg-[#ea580c] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                    {l.pricing.popular}
                  </span>
                </div>
                <div className="mb-5">
                  <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">
                    {l.pricing.proLabel}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-2">
                    <div className="text-4xl font-extrabold text-white">
                      $9.99
                    </div>
                    <div className="text-blue-300/60 text-xs font-normal">
                      USD
                    </div>
                    <div className="text-blue-300 text-sm pb-0.5">
                      / {l.pricing.proPeriod}
                    </div>
                  </div>
                  <div className="text-blue-400 text-xs mt-1">
                    $79.99/año
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-blue-100 flex-1 mb-6">
                  {[
                    l.pricing.proF1,
                    l.pricing.proF2,
                    l.pricing.proF3,
                    l.pricing.proF4,
                    l.pricing.proF5,
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-[#ea580c]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href="/login" className="block w-full bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-bold py-3 rounded-xl transition-transform hover:scale-105 active:scale-95 anim-pulse-cta text-center">
                  {l.pricing.proCta}
                </a>
                <p className="text-center text-blue-400 text-xs mt-3">
                  Sin tarjeta · Cancela cuando quieras.
                </p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>


      {/* Seguridad de datos */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <RevealOnScroll>
            <div className="flex flex-col sm:flex-row items-start gap-5 bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-[#1e3a5f] text-base mb-1">Tus datos y los de tus atletas están seguros</p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Medaliq usa HTTPS en todas las conexiones, almacenamiento en Neon (PostgreSQL serverless con backups automáticos) y autenticación segura. Los datos de salud de tus atletas nunca se comparten con terceros ni se usan para publicidad.
                </p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* 9b · Garantía + FAQ */}
      <section className="py-12 sm:py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <RevealOnScroll>
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                ✓ 30 días de garantía
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-center text-[#1e3a5f] mb-4">
              {l.guarantee.title}
            </h2>
            <p className="text-center text-gray-500 text-base mb-10">
              {l.guarantee.subtitle}
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={50}>
            <div className="bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.3)] rounded-2xl px-7 py-6 flex items-start gap-5 mb-8">
              <div className="w-12 h-12 rounded-full bg-[rgba(249,115,22,0.15)] flex items-center justify-center shrink-0">
                <span className="text-[#ea580c] text-xl">🛡️</span>
              </div>
              <div>
                <p className="font-bold text-[#1e3a5f] text-lg mb-1">
                  {l.guarantee.badgeTitle}
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {l.guarantee.badgeDesc}
                </p>
              </div>
            </div>
          </RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-7">
            {[
              { q: l.guarantee.faq1Q, a: l.guarantee.faq1A, delay: 0 },
              { q: l.guarantee.faq2Q, a: l.guarantee.faq2A, delay: 80 },
              { q: l.guarantee.faq3Q, a: l.guarantee.faq3A, delay: 0 },
              { q: l.guarantee.faq4Q, a: l.guarantee.faq4A, delay: 80 },
            ].map((faq) => (
              <RevealOnScroll key={faq.q} delay={faq.delay}>
                <div>
                  <p className="font-bold text-[#1e3a5f] text-base mb-2">
                    {faq.q}
                  </p>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-12 sm:py-20 px-4 bg-gradient-to-br from-[#1e3a5f] to-[#0f2240] text-white text-center">
        <RevealOnScroll>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            {l.finalCta.title}
          </h2>
          <p className="text-blue-200 mb-8 text-base max-w-md mx-auto">
            {l.finalCta.subtitle}
          </p>
          <a href="/login" className="block w-full sm:w-auto sm:inline-block anim-pulse-cta bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-semibold text-sm sm:font-bold sm:text-lg px-9 py-[12px] sm:py-4 rounded-xl transition-transform hover:scale-105 active:scale-95 text-center">
            {l.finalCta.cta}
          </a>
        </RevealOnScroll>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-blue-200 py-10 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-xl font-extrabold text-white">Medaliq</span>
            <span className="text-sm text-blue-300">{l.footer.tagline}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="/terminos" className="hover:text-white transition-colors">
              {l.footer.terms}
            </a>
            <a
              href="/privacidad"
              className="hover:text-white transition-colors"
            >
              {l.footer.privacy}
            </a>
            <a
              href="mailto:hola@medaliq.com"
              className="hover:text-white transition-colors"
            >
              hola@medaliq.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
