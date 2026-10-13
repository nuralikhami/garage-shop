let editingId = null;
async function login() {
    try {
        const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: document.getElementById('password').value }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        document.getElementById('password').value = '';
        document.getElementById('login').style.display = 'none';
        document.getElementById('panel').style.display = 'block';
        await loadAdminProducts();
    } catch (error) { alert(error.message || 'Не удалось войти'); }
}
async function adminFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (response.status === 401) {
        document.getElementById('login').style.display = 'block';
        document.getElementById('panel').style.display = 'none';
    }
    return response;
}
async function saveProduct() {
    try {

    const title = document.getElementById("title").value.trim();
    const price = Number(document.getElementById("price").value);
    const description = document.getElementById("description").value.trim();
    const status = document.getElementById("status").value;

    if (!title || !document.getElementById("price").value.trim() || !description) {
        alert("Заполните название, цену и описание.");
        return;
    }
    if (title.length > 300) {
        alert("Название слишком длинное: максимум 300 символов. Подробности перенесите в описание.");
        return;
    }
    if (!Number.isFinite(price) || price < 0) {
        alert("Введите цену числом, не меньше нуля.");
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

const response = await adminFetch(url, {
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

        alert(result.error || "❌ Ошибка при сохранении.");

    }

    } catch { alert("Не удалось сохранить товар. Проверьте соединение и попробуйте снова."); }
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

window.onload = async () => {
    try {
        const response = await fetch('/api/admin/session');
        const result = await response.json();
        if (result.authenticated) {
            document.getElementById('login').style.display = 'none';
            document.getElementById('panel').style.display = 'block';
            await loadAdminProducts();
        }
    } catch { alert('Не удалось подключиться к серверу'); }
};
async function deleteProduct(id){
    try {

    const ok = confirm("Удалить этот товар?");

    if(!ok) return;

    const response = await adminFetch("/api/products/" + id, {

        method:"DELETE"

    });

    const result = await response.json();

    if(result.success){

        alert("✅ Товар удалён");

        loadAdminProducts();

    }else{

        alert("Ошибка удаления");

    }

    } catch { alert("Не удалось удалить товар. Попробуйте снова."); }
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
