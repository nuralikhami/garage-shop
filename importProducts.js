const fs = require("fs");
const path = require("path");
const db = require("./database");

const productsFile = path.join(__dirname, "data", "products.json");

if (!fs.existsSync(productsFile)) {
    console.log("❌ Файл products.json не найден.");
    process.exit();
}

const products = JSON.parse(fs.readFileSync(productsFile));

let imported = 0;

products.forEach((product) => {

    db.run(
        `INSERT INTO products
        (title, price, status, isNew, description, images)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            product.title,
            product.price,
            product.status,
            product.new ? 1 : 0,
            JSON.stringify(product.description),
            JSON.stringify(product.images)
        ],
        (err) => {

            if (err) {
                console.log("Ошибка:", err.message);
                return;
            }

            imported++;

            if (imported === products.length) {

                console.log("✅ Импорт завершён!");
                console.log("Товаров перенесено:", imported);

                db.close();

            }

        }
    );

});