const questionHeaders = document.querySelectorAll('.question-header')

questionHeaders.forEach((header) => {
  header.addEventListener('click', (e) => {
    if (e.target.classList.contains('active')) {
      e.target.classList.toggle('active');
    } else {
      document.querySelector('.active')?.classList.remove('active');
      e.target.classList.toggle('active');
    }
  })
});
