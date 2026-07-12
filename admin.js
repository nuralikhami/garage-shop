const ADMIN_PASSWORD = "12345";
let editingId = null;

function login() {
    const pass = document.getElementById("password").value;

    if (pass === ADMIN_PASSWORD) {
        document.getElementById("login").style.display = "none";
        document.getElementById("panel").style.display = "block";
    } else {
        alert("Неверный пароль");
    }
}

async function saveProduct() {

    const title = document.getElementById("title").value.trim();
    const price = Number(document.getElementById("price").value);
    const description = document.getElementById("description").value.trim();
    const status = document.getElementById("status").value;

    if (!title || !price || !description) {
        alert("Заполни все поля.");
        return;
    }

    const product = {
        title,
        price,
        status,
        new: true,
        description: description
            .split("\n")
            .filter(text => text.trim() !== "")
    };

    const formData = new FormData();

    formData.append("product", JSON.stringify(product));

    // Добавляем фотографии строго по порядку
    for (let i = 1; i <= 5; i++) {

        const input = document.getElementById("photo" + i);

        if (input.files.length > 0) {

            formData.append("photos", input.files[0]);

        }

    }

   let url = "/api/products";
let method = "POST";

if (editingId !== null) {

    url = "/api/products/" + editingId;
    method = "PUT";

}

const response = await fetch(url, {
    method: method,
    body: formData
});

    const result = await response.json();

   if (result.success) {

    alert(
        editingId === null
        ? "✅ Товар успешно добавлен!"
        : "✅ Изменения сохранены!"
    );

    editingId = null;

    location.reload();

}else {

        alert("❌ Ошибка при сохранении.");

    }

}





for(let i=1;i<=5;i++){

    const input=document.getElementById("photo"+i);

    const preview=document.getElementById("preview"+i);

    input.addEventListener("change",()=>{

        if(input.files.length){

            preview.src=URL.createObjectURL(input.files[0]);

            preview.style.display="block";

        }

    });

}
async function loadAdminProducts(){

    const response = await fetch("/api/products");

    const products = await response.json();

    const list = document.getElementById("productsList");

    list.innerHTML = "";

    products.forEach(product=>{

        list.innerHTML += `

<div class="product-item">

    <img src="${product.images[0]}">

    <div class="product-info">

        <h3>${product.title}</h3>

        <p><b>${product.price} ₸</b></p>

        <p>${product.status}</p>

    </div>

    <div class="product-actions">

       <button
class="edit-btn"
onclick="editProduct(${product.id})">

    ✏️ Редактировать

</button>

        <button
        class="delete-btn"
        onclick="deleteProduct(${product.id})">

            🗑️ Удалить

        </button>

    </div>

</div>

`;

    });

}

window.onload = ()=>{

    loadAdminProducts();

};
async function deleteProduct(id){

    const ok = confirm("Удалить этот товар?");

    if(!ok) return;

    const response = await fetch("/api/products/" + id, {

        method:"DELETE"

    });

    const result = await response.json();

    if(result.success){

        alert("✅ Товар удалён");

        loadAdminProducts();

    }else{

        alert("Ошибка удаления");

    }

}
async function editProduct(id){

    alert("Редактирование: " + id);

    const response = await fetch("/api/products");

    const products = await response.json();

    const product = products.find(p => p.id === id);

    if(!product) return;

    editingId = id;

    document.getElementById("title").value = product.title;
    document.getElementById("price").value = product.price;
    document.getElementById("description").value =
        product.description.join("\n");
    document.getElementById("status").value = product.status;

    document.querySelector(".admin-panel button").innerText =
        "💾 Сохранить изменения";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}