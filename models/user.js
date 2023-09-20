const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const userSchema = new Schema({
  name: { type: String, required: true, min: 4, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
});
const userModel = model("user", userSchema);
module.exports = userModel;
