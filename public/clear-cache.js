// Script pour forcer le nettoyage du cache du navigateur
(function() {
  // Supprimer tous les tokens Supabase du localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('auth'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Supprimer tous les cookies Supabase
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=.qgchatting.com"); 
  });
  
  // Forcer le rechargement de la page
  window.location.reload(true);
})();
