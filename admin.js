const ADMIN_PASSWORD = "12345";

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

    const response = await fetch("/api/products", {
        method: "POST",
        body: formData
    });

    const result = await response.json();

    if (result.success) {

        alert("✅ Товар успешно сохранён!");

        location.reload();

    } else {

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
