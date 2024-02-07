
document.addEventListener("DOMContentLoaded", function () {
    const elementsToAnimate = document.querySelectorAll(".animation-target");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          } else {
            entry.target.classList.remove("visible");
          }
        });
      },
      { threshold: 0.1 } // Adjust the threshold as needed
    );

    elementsToAnimate.forEach((element) => {
      observer.observe(element);
    });
  });