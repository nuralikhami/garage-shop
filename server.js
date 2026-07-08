const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({

    destination(req, file, cb) {

        cb(null, "uploads");

    },

    filename(req, file, cb) {

        const uniqueName = Date.now() + "-" + file.originalname;

        cb(null, uniqueName);

    }

});

const upload = multer({ storage });

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Отдаём весь сайт
app.use(express.static(__dirname));

// Папка с фотографиями
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Файл с товарами
const productsFile = path.join(__dirname, "data", "products.json");

// Получить все товары
app.get("/api/products", (req, res) => {

    if (!fs.existsSync(productsFile)) {

        return res.json([]);

    }

    const products = JSON.parse(fs.readFileSync(productsFile));

    res.json(products);

});

// Сохранить товар
// Получить все товары
app.get("/api/products", (req, res) => {

    if (!fs.existsSync(productsFile)) {
        return res.json([]);
    }

    const products = JSON.parse(fs.readFileSync(productsFile));

    res.json(products);

});

app.post("/api/products", upload.array("photos"), (req, res) => {

    let products = [];

    if (fs.existsSync(productsFile)) {

        products = JSON.parse(fs.readFileSync(productsFile));

    }
console.log(req.body);
console.log(req.files);

const product = JSON.parse(req.body.product);


    product.id = Date.now();

    product.images = req.files.map(file => "/uploads/" + file.filename);

    products.push(product);

    fs.writeFileSync(productsFile, JSON.stringify(products, null, 4));

    res.json({
        success: true
    });

});

app.listen(PORT, () => {

    console.log("==================================");
    console.log("🚗 Garage запущен");
    console.log("http://localhost:3000");
    console.log("==================================");

});