const mod = (n, m) => (n % m + m) % m;

const reviews = document.querySelectorAll(".review-wrapper");
const active = document.querySelector(".active");
const activeIndex = Array.prototype.indexOf.call(reviews, active);

const left = document.getElementById("left-arrow");
const right = document.getElementById("right-arrow");

const toggle = (i) => {
    const newActive = reviews.item(i);
    active.classList.toggle("active");
    active.classList.toggle("disabled");
    newActive.classList.toggle("active");
    newActive.classList.toggle("disabled");
}

left.addEventListener("click", e => {
    const newIndex = mod(activeIndex - 1, reviews.length);
    toggle(newIndex);
})

right.addEventListener("click", e => {
    const newIndex = mod(activeIndex + 1, reviews.length);
    toggle(newIndex);
})