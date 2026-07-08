let products = [];
let phoneNumber = "77072681906";

const cards = document.getElementById("cards");
const count = document.getElementById("count");

function renderProducts() {
    cards.innerHTML = "";

    count.innerText = products.length + " товар(ов)";

products.forEach((product, index) => {

    let statusText = "";
    let statusColor = "";

    switch(product.status){

        case "available":
            statusText = "🟢 В наличии";
            statusColor = "#188a33";
            break;

        case "reserve":
            statusText = "🟡 Бронь";
            statusColor = "#d4a017";
            break;

        case "sold":
            statusText = "🔴 Продано";
            statusColor = "#b22222";
            break;
    }

    let message =
`Здравствуйте!

Меня интересует товар:

${product.title}

Цена: ${product.price} ₸

Он ещё в наличии?`;

    let whatsapp =
`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    let badge = "";

    if(product.new){

        badge = `<span class="status new">⭐ Новинка</span>`;

    }

    cards.innerHTML += `

<div class="card">

<img src="${product.images[0]}" alt="${product.title}"onclick="openProduct(${index})">

<div class="card-content">

<div>

<span class="status"
style="background:${statusColor};">

${statusText}

</span>

${badge}

</div>

<h3>${product.title}</h3>

<div class="price">

${product.price} ₸

</div>

<ul>

${product.description
    .slice(0, 4)
    .map(item => `<li>✅ ${item}</li>`)
    .join("")}

</ul>

${product.description.length > 4
    ? `<p class="more">...ещё ${product.description.length - 4} пунктов</p>`
    : ""}

<a
class="buy-btn"
target="_blank"
href="${whatsapp}">

💬 Написать в WhatsApp

</a>

</div>

</div>

`;

});
const observer = new IntersectionObserver((entries)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.classList.add("show");

}

});

},{
threshold:0.15
});

document.querySelectorAll(".card").forEach(card=>{

observer.observe(card);

});
}

// =======================
// ГАЛЕРЕЯ ТОВАРА
// =======================

const modal = document.getElementById("productModal");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDescription = document.getElementById("modalDescription");
const modalWhatsapp = document.getElementById("modalWhatsapp");

const closeBtn = document.querySelector(".close");
const prevBtn = document.getElementById("prevPhoto");
const nextBtn = document.getElementById("nextPhoto");

let currentProduct = null;
let currentImage = 0;



function openProduct(index){

    currentProduct = products[index];
    currentImage = 0;

    modal.style.display = "flex";

    document.body.style.overflow = "hidden";

    modalTitle.innerText = currentProduct.title;

    modalPrice.innerText = currentProduct.price + " ₸";

    modalImage.src = currentProduct.images[currentImage];

    modalDescription.innerHTML = "";

    currentProduct.description.forEach(item=>{

        modalDescription.innerHTML += `<li>✅ ${item}</li>`;

    });

    const message =
`Здравствуйте!

Меня интересует товар:

${currentProduct.title}

Цена: ${currentProduct.price} ₸

Он ещё в наличии?`;

    modalWhatsapp.href =
`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

}

nextBtn.onclick = (index)=>{

    currentImage++;

    if(currentImage>=currentProduct.images.length){

        currentImage=0;

    }

    modalImage.src=currentProduct.images[currentImage];

}

prevBtn.onclick = (index)=>{

    currentImage--;

    if(currentImage<0){

        currentImage=currentProduct.images.length-1;

    }

    modalImage.src=currentProduct.images[currentImage];

}

closeBtn.onclick = ()=>{

    modal.style.display = "none";

    document.body.style.overflow = "auto";

}

modal.onclick=(e)=>{

    if(e.target===modal){

        modal.style.display="none";

        document.body.style.overflow="auto";

    }

}

document.addEventListener("keydown",(e)=>{

    if(modal.style.display!=="flex") return;

    if(e.key==="Escape"){

    modal.style.display="none";

    document.body.style.overflow="auto";

}

    if(e.key==="ArrowRight"){

        nextBtn.click();

    }

    if(e.key==="ArrowLeft"){

        prevBtn.click();

    }

});

async function loadProducts() {

    const response = await fetch("/api/products");

    products = await response.json();

    renderProducts();

}

loadProducts();