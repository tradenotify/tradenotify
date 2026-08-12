const translations = {
  es: {
    "nav.app_btn": "Acceder a mi App",
    "hero.badge": "⚡ Latencia Cero en iOS & PC",
    "hero.title_start": "Alertas de TradingView en tu móvil",
    "hero.title_end": "al milisegundo",
    "hero.description": "Elimina los retrasos de Telegram y el correo. Recibe señales de tus indicadores y estrategias directamente en tu pantalla de bloqueo con sonido y vibración en tiempo real.",
    "hero.btn_pricing": "Ver Planes",
    "hero.btn_token": "Tengo un Token",
    "preview.badge": "📱 Web Push Directo",
    "preview.signal_title": "🟢 NASDAQ 100 - BUY SIGNAL",
    "preview.signal_body": "Entrada: 19,850.50 | SL: 19,800.00 | TP: 19,950.00",
    "why.title": "¿Por qué TradeNotify?",
    "why.subtitle": "Infraestructura directa para traders que necesitan reaccionar en el segundo exacto.",
    "why.f1_title": "Latencia Cero",
    "why.f1_desc": "Conexión directa con los servidores de notificación de Apple y Google. Sin cuellos de botella.",
    "why.f2_title": "Sin Apps de Terceros",
    "why.f2_desc": "Funciona con la tecnología PWA nativa de Safari y Chrome. Se añade a la pantalla de inicio en un clic.",
    "why.f3_title": "Traders & Mentores",
    "why.f3_desc": "Válido para uso personal o para emitir señales instantáneas a comunidades completas.",
    "pricing.title": "Planes y Precios",
    "pricing.subtitle": "Suscripción sin permanencia ni límites de volumen.",
    "pricing.trader_badge": "MÁS POPULAR",
    "pricing.trader_title": "Plan Trader",
    "pricing.trader_desc": "Para traders individuales que buscan rapidez en sus entradas.",
    "pricing.trader_feat1": "Alertas ilimitadas",
    "pricing.trader_feat2": "Hasta 2 dispositivos (iPhone + PC)",
    "pricing.trader_feat3": "Webhook privado de alta velocidad",
    "pricing.trader_feat4": "Historial en tiempo real",
    "pricing.trader_btn": "Suscribirme Ahora",
    "pricing.mentor_title": "Plan Mentor",
    "pricing.mentor_desc": "Para academias y creadores que transmiten a su comunidad.",
    "pricing.mentor_feat1": "Alertas ilimitadas",
    "pricing.mentor_feat2": "Hasta 50 alumnos / dispositivos",
    "pricing.mentor_feat3": "1 Webhook ➔ Retransmisión en paralelo",
    "pricing.mentor_feat4": "Panel de administración de cupos",
    "pricing.mentor_btn": "Suscribirme Ahora",
    "footer.rights": "© 2026 TradeNotify. Todos los derechos reservados. Plataforma de software independiente."
  },
  en: {
    "nav.app_btn": "Open App",
    "hero.badge": "⚡ Zero Latency on iOS & PC",
    "hero.title_start": "TradingView alerts on your lockscreen",
    "hero.title_end": "in milliseconds",
    "hero.description": "Eliminate Telegram and email delays. Receive indicator and strategy signals straight to your lock screen with instant sound and vibration.",
    "hero.btn_pricing": "View Plans",
    "hero.btn_token": "I have a Token",
    "preview.badge": "📱 Direct Web Push",
    "preview.signal_title": "🟢 NASDAQ 100 - BUY SIGNAL",
    "preview.signal_body": "Entry: 19,850.50 | SL: 19,800.00 | TP: 19,950.00",
    "why.title": "Why TradeNotify?",
    "why.subtitle": "Direct infrastructure built for traders who need sub-second execution alerts.",
    "why.f1_title": "Zero Latency",
    "why.f1_desc": "Direct connection to Apple and Google push notification servers. No bottlenecks.",
    "why.f2_title": "No Bloated Apps",
    "why.f2_desc": "Runs on native PWA technology in Safari and Chrome. Add to home screen in one tap.",
    "why.f3_title": "Traders & Mentors",
    "why.f3_desc": "Perfect for single traders or broadcasting instant signals to entire trading communities.",
    "pricing.title": "Simple Pricing",
    "pricing.subtitle": "Transparent subscription with no signal volume limits.",
    "pricing.trader_badge": "MOST POPULAR",
    "pricing.trader_title": "Trader Plan",
    "pricing.trader_desc": "For individual traders requiring instant trade signal delivery.",
    "pricing.trader_feat1": "Unlimited alerts",
    "pricing.trader_feat2": "Up to 2 devices (iPhone + PC)",
    "pricing.trader_feat3": "Private high-speed webhook",
    "pricing.trader_feat4": "Real-time alert history",
    "pricing.trader_btn": "Subscribe Now",
    "pricing.mentor_title": "Mentor Plan",
    "pricing.mentor_desc": "For trading academies and signal providers.",
    "pricing.mentor_feat1": "Unlimited alerts",
    "pricing.mentor_feat2": "Up to 50 members / devices",
    "pricing.mentor_feat3": "1 Webhook ➔ Parallel fan-out",
    "pricing.mentor_feat4": "Channel management dashboard",
    "pricing.mentor_btn": "Subscribe Now",
    "footer.rights": "© 2026 TradeNotify. All rights reserved. Independent software tool."
  }
};

function applyLanguage(lang) {
  const selectedLang = translations[lang] ? lang : 'es';
  localStorage.setItem('tradeNotify_lang', selectedLang);
  document.documentElement.lang = selectedLang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (translations[selectedLang] && translations[selectedLang][key]) {
      el.textContent = translations[selectedLang][key];
    }
  });

  const selector = document.getElementById('langSelector');
  if (selector) selector.value = selectedLang;
}

document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('tradeNotify_lang') || 'es';
  applyLanguage(savedLang);
});