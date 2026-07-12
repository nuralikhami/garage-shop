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
const PORT = process.env.PORT || 3000;

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

app.delete("/api/products/:id", (req, res) => {

    let products = JSON.parse(fs.readFileSync(productsFile));

    const id = Number(req.params.id);

    products = products.filter(product => product.id !== id);

    fs.writeFileSync(productsFile, JSON.stringify(products, null, 4));

    res.json({
        success: true
    });

});

app.put("/api/products/:id", upload.array("photos"), (req, res) => {

    let products = JSON.parse(fs.readFileSync(productsFile));

    const id = Number(req.params.id);

    const newData = JSON.parse(req.body.product);

    const index = products.findIndex(product => product.id === id);

    if (index === -1) {

        return res.status(404).json({
            success: false,
            message: "Товар не найден"
        });

    }

    newData.id = id;

    // Если загрузили новые фото — заменяем
    if (req.files.length > 0) {

        newData.images = req.files.map(file => "/uploads/" + file.filename);

    } else {

        // Если фото не меняли — оставляем старые
        newData.images = products[index].images;

    }

    products[index] = newData;

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