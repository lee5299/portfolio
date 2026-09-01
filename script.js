document.addEventListener("DOMContentLoaded", () => {
  // 1. IntersectionObserver (화면 등장 감지)
  if ('IntersectionObserver' in window) {
    const observerOptions = { root: null, rootMargin: "0px", threshold: 0.1 };
    const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));
  } else {
    document.querySelectorAll(".fade-in").forEach(el => el.classList.add("visible"));
  }

  // 2. T01-C19, C20, C21: 마우스 & 키보드 공용 프로젝트 펼치기/접기 상호작용
  const toggleBtn = document.getElementById("toggle-projects-btn");
  const extraProjects = document.querySelectorAll(".extra-project");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
      
      extraProjects.forEach(card => {
        if (isExpanded) {
          card.classList.remove("is-visible");
        } else {
          card.classList.add("is-visible");
        }
      });

      toggleBtn.setAttribute("aria-expanded", !isExpanded);
      toggleBtn.textContent = isExpanded ? "프로젝트 전체 보기 (+2)" : "프로젝트 접기";
    });
  }

  // 3. 네비게이션 부드러운 스크롤 이동
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});