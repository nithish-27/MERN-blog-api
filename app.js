const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const morgan = require("morgan");
const cors = require("cors");
const multer = require("multer");
const Path = require("path");

const fs = require("fs");
const uploadMiddleware = multer({ dest: "uploads" });
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const app = express();
const User = require("./models/user");
const Post = require("./models/post");
const salt = bcrypt.genSaltSync(10);
const secret = "jancoonacoicnaoiim";
app.use(cookieParser());
app.use(cors({ credentials: true, origin: "http://localhost:3002" }));
dotenv.config(".env");
app.use("/uploads", express.static(__dirname + "/uploads"));
mongoose.connect(
  "mongodb+srv://rajnithish27:KbXwsUNMAl3jyEX7@cluster0.jvpr63g.mongodb.net/?retryWrites=true&w=majority"
);
app.use(express.json());
app.use(morgan("tiny"));

// signup

app.post("/register", async (req, res) => {
  try {
    const { name, password, email } = req.body;

    const userdoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userdoc);
  } catch (e) {
    res.status(400).json(e);
    console.log(e);
  }
});

// login
//
app.post("/login", async (req, res) => {
  try {
    const { password, email } = req.body;
    const userdoc = await User.findOne({ email });

    if (!userdoc) {
      return res.status(404).json({ message: "User not found" });
    }

    const passOk = await bcrypt.compare(password, userdoc.password);

    if (!passOk) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const expiresIn = "15d"; // 15 days in seconds
    jwt.sign(
      { email, id: userdoc._id, user: userdoc.name },
      secret,
      { expiresIn },
      (err, token) => {
        if (err) {
          console.error("[JWT Error]", err);
          return res.status(500).json({ message: "Token generation failed" });
        }
        res
          .cookie("token", token, { httpOnly: true, secure: true })
          .json(userdoc);
      }
    );
  } catch (error) {
    console.error("[Login Error]", error);
    res.status(500).json({ message: "Login failed" });
  }
});

//
// app.post("/login", async (req, res) => {
//   const { password, email } = req.body;
//   const userdoc = await User.findOne({ email });
//   console.log("[server]", userdoc);
//   const expiresIn = "15d";
//   const passOk = bcrypt.compareSync(password, userdoc.password);
//   if (passOk) {
//     jwt.sign(
//       { email, id: userdoc._id, user: userdoc.name },
//       secret,
//       { expiresIn },
//       (err, token) => {
//         if (err) throw err;
//         res.cookie("token", token).json(userdoc);
//       }
//     );
//   }
// });

// logout
app.post("/logout", function (req, res) {
  res.clearCookie("token").json("ok");
});

// post

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { title, summary, file, content } = req.body;
  const { originalname, path } = req.file;
  console.log("[file]", req.file);
  const parts = originalname.split(".");

  const ext = parts[parts.length - 1];
  const newpath = path + "." + ext;

  fs.renameSync(path, newpath);
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;

    const postdoc = await Post.create({
      title,
      summary,
      image: newpath,
      content,
      author: info.id,
    });
    // console.log(postdoc.image);
    res.json(postdoc);
  });
  // res.json({ ext });
  // const imagePath = Path.join("uploads", Path.basename(newpath))
  // console.log("imgPath", imagePath);
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["name"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

// app.put("/post", (req, res) => {
//   console.log(req);
// });
app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  console.log(req.body);
  const { title, summary, content, id } = req.body;
  let newPath = null;

  if (req.file) {
    const { originalname, path } = req.file;

    const parts = originalname.split(".");

    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;

    fs.renameSync(path, newPath);
  }
  // res.json(newPath);
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (isAuthor) {
      const postdoc = await Post.findByIdAndUpdate(id, {
        title,
        summary,
        content,
        image: newPath ? newPath : postDoc.image,
      });
      res.json(newPath);
    }
    if (!isAuthor) {
      return res.status(400).json("your are not a author");
    }
    // const postdoc = await Post.create({
    //   title,
    //   summary,
    //   image: newpath,
    //   content,
    //   author: info.id,
    // });
    // console.log(postdoc.image);
    // res.json(isAuthor);
  });
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const postdoc = await Post.findById(id).populate("author", ["name"]);
    res.json(postdoc);
  } catch (e) {
    res.status(404).json({ error: "Post not found" });
  }
});
// app.delete('/post',async function deleteHandler(req,res){
//   const {id} = req.body;
//   try{
//     const postdoc = await Post.findByIdAndDelete(id);
//     res.json(postdoc);
//   }catch(e){
//     res.status(404).json({error:"Post not found"})
//   }
// })

// cookie
//
app.get("/profile", (req, res) => {
  const { token } = req.cookies;

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token expired" });
      }

      console.error("JWT Verification Error:", err.message);
      return res.status(401).json({ error: "Invalid Token" });
    }

    res.json(info);
  });
});

//
// app.get("/profile", (req, res) => {
//   const { token } = req.cookies;
//   jwt.verify(token, secret, {}, (err, info) => {
//     if (err) {
//       console.error("JWT Verification Error:", err.message);
//       return res.status(401).json({ error: "Invalid Token" });
//     }
//     res.json(info);
//   });
// });

const port = process.env.PORT || 3002;

app.listen(port, () => {
  console.log(`server is running on http://localhost:${port}`);
});
