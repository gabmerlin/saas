// Script pour forcer le nettoyage COMPLET du cache du navigateur
(function() {
  console.log('🧹 Nettoyage complet du cache...');
  
  // 1. Supprimer TOUT du localStorage
  localStorage.clear();
  console.log('✅ localStorage vidé');
  
  // 2. Supprimer TOUT du sessionStorage
  sessionStorage.clear();
  console.log('✅ sessionStorage vidé');
  
  // 3. Supprimer tous les cookies
  document.cookie.split(";").forEach(function(c) { 
    const cookie = c.replace(/^ +/, "").split('=')[0];
    document.cookie = cookie + "=;expires=" + new Date().toUTCString() + ";path=/";
    document.cookie = cookie + "=;expires=" + new Date().toUTCString() + ";path=/;domain=.qgchatting.com";
    document.cookie = cookie + "=;expires=" + new Date().toUTCString() + ";path=/;domain=www.qgchatting.com";
  });
  console.log('✅ Cookies supprimés');
  
  // 4. Supprimer le cache du service worker si présent
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
  console.log('✅ Service workers supprimés');
  
  // 5. Forcer le rechargement avec cache bypass
  console.log('🔄 Rechargement avec bypass cache...');
  window.location.reload(true);
  
  // 6. Fallback si reload ne fonctionne pas
  setTimeout(() => {
    window.location.href = window.location.origin + '?cache_cleared=' + Date.now();
  }, 1000);
})();
