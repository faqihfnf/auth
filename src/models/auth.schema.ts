import { model, Schema } from "mongoose";

//* Schema
const authSchema = new Schema({
  userId: String,
  refreshToken: String,
});

export const Auth = model("Auth", authSchema);
