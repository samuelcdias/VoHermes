document.addEventListener("DOMContentLoaded",() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/src/sw.js');
  }
})