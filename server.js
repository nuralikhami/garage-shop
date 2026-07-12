const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const db = require("./database");

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

// Получить все товары
app.get("/api/products", (req, res) => {

    db.all("SELECT * FROM products ORDER BY id DESC", [], (err, rows) => {

        if (err) {

            return res.status(500).json(err);

        }

        const products = rows.map(product => ({

            id: product.id,
            title: product.title,
            price: product.price,
            status: product.status,
            new: product.isNew === 1,
            description: JSON.parse(product.description),
            images: JSON.parse(product.images)

        }));

        res.json(products);

    });

});

// Сохранить товар


app.post("/api/products", upload.array("photos"), (req, res) => {

    const product = JSON.parse(req.body.product);

    const images = req.files.map(file => "/uploads/" + file.filename);

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
            JSON.stringify(images)
        ],
        function(err){

            if(err){

                console.log(err);

                return res.json({success:false});

            }

            res.json({success:true});

        }

    );

});


app.put("/api/products/:id", upload.array("photos"), (req, res) => {

    const id = Number(req.params.id);

    const product = JSON.parse(req.body.product);

    db.get("SELECT * FROM products WHERE id=?", [id], (err, oldProduct)=>{

        if(!oldProduct){

            return res.json({success:false});

        }

        let images = JSON.parse(oldProduct.images);

        if(req.files.length){

            images = req.files.map(file=>"/uploads/"+file.filename);

        }

        db.run(

            `UPDATE products
             SET title=?,
                 price=?,
                 status=?,
                 isNew=?,
                 description=?,
                 images=?
             WHERE id=?`,

            [

                product.title,
                product.price,
                product.status,
                product.new ? 1 : 0,
                JSON.stringify(product.description),
                JSON.stringify(images),
                id

            ],

            function(err){

                if(err){

                    console.log(err);

                    return res.json({success:false});

                }

                res.json({success:true});

            }

        );

    });

});

app.delete("/api/products/:id", (req,res)=>{

    const id = Number(req.params.id);

    db.run(

        "DELETE FROM products WHERE id=?",

        [id],

        function(err){

            if(err){

                console.log(err);

                return res.json({success:false});

            }

            res.json({success:true});

        }

    );

});



app.listen(PORT, () => {

    console.log("==================================");
    console.log("🚗 Garage запущен");
    console.log("http://localhost:3000");
    console.log("==================================");

});