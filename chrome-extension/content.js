window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'HIGHLIGHT_PAGE') {
    document.body.style.backgroundColor = '#ffff99';
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 1000);
  }
}); 