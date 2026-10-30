let count = 7;
const el = document.getElementById("count");

const animateCount = () => {
  el.classList.remove("is-animating");
  void el.offsetWidth;
  el.classList.add("is-animating");
};

animateCount();

const timer = setInterval(() => {
  count--;
  el.textContent = count;
  animateCount();

  if (count === 0) {
    clearInterval(timer);
    setTimeout(() => {
      window.location.href = "/service/appraisal/index.html";
    }, 700);
  }
}, 1000);
