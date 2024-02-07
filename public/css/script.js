// var slides=['https://t3.ftcdn.net/jpg/04/68/47/46/360_F_468474640_YcXTQsmw1U2sqnFG8vZyTq8SyoYsbvva.jpg','http://www.fuelfornation.com/assets/img/home/banner/banner.jpg','https://www.narayanseva.org/wp-content/uploads/2021/12/achievement-banner-1.jpg'];

// var Start=0;

// function slider(){
//     if(Start<slides.length){
//         Start=Start+1;
//     }
//     else{
//         Start=1;
//     }
//     console.log(img);
//     // img.innerHTML = "<img  src="+slides[Start-1]+">";
//     document.querySelector("#img").setAttribute("src",slides[Start-1]);
   
// }
// setInterval(slider,3000);


const imageWrapper = document.querySelector('.image-wrapper');
const imageItems = document.querySelectorAll('.image-wrapper > *');
let perView = 3;
let totalScroll = 0;
const delay = 1000;

function updatePerView() {
  if (window.innerWidth <= 320) {
    perView = 1;
  }else if (window.innerWidth <= 768) {
    perView = 2;
  } else {
    perView = 3;
  }
  imageWrapper.style.setProperty('--per-view', perView);
}

// Initial setup
updatePerView();
for (let i = 0; i < perView; i++) {
  imageWrapper.insertAdjacentHTML('beforeend', imageItems[i].outerHTML);
}

let autoScroll = setInterval(scrolling, delay);

function scrolling() {
  totalScroll++;
  if (totalScroll == imageItems.length + 1) {
    clearInterval(autoScroll);
    totalScroll = 1;
    imageWrapper.style.transition = '0s';
    imageWrapper.style.left = '0';
    updatePerView(); // Update perView based on window width
    autoScroll = setInterval(scrolling, delay);
  }
  const widthEl = document.querySelector('.image-wrapper > :first-child').offsetWidth + 24;
  imageWrapper.style.left = `-${totalScroll * widthEl}px`;
  imageWrapper.style.transition = '.3s';
}

// Update perView on window resize
window.addEventListener('resize', updatePerView);

