const mongoose = require("mongoose");
const postSchema = new mongoose.Schema(
  {
    title: String,
    summary: String,
    image: String,
    content: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  {
    timestamps: true,

    // authorId : {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "User",
    // },
    // authorName: String,
    // date: {
    //     type: Date,
    //     default: Date.now,
    // },
  }
);
const Post = mongoose.model("Post", postSchema);
module.exports = Post;
