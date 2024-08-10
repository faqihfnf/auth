import { model, Schema } from "mongoose";

//* Schema
const userSchema = new Schema({
  name: String,
  email: String,
  password: String,
});

export const User = model("User", userSchema);
