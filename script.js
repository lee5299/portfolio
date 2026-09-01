document.addEventListener("DOMContentLoaded", () => {
  // 스크롤 감지 애니메이션 (Fade-in)
  const observerOptions = { 
    root: null, 
    rootMargin: "0px", 
    threshold: 0.15 
  };
  
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));

  // 메뉴 클릭 시 부드러운 스크롤 이동
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});