import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "./models/user.schema";
import jwt, { verify } from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Auth } from "./models/auth.schema";
dotenv.config();

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch(() => {
    console.log("MongoDB not connected");
  });

const app = express();
app.use(express.json());
app.use(cookieParser());

//? Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  //* input validation

  //* hash password
  const hashedPassword = await bcrypt.hash(password, 13);

  //* payload untuk menampung data
  const newUser = {
    name,
    email,
    password: hashedPassword,
  };

  //* insert data ke DB
  const createUser = new User(newUser);
  const data = await createUser.save();

  return res.status(201).json({ message: "Register Success", data });
});

//? Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body; //*data diterima dari body

  //* input validation
  if (!email || password.length < 8) {
    return res.status(403).json({ message: "Email minimal 8 caracters" });
  }

  //* find user by email
  const user = await User.findOne({ email });

  //* user not found
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  //* password validation dilakukan ketika usernya ada
  const isPassMatch = await bcrypt.compare(password, user.password as string);

  //* password not match
  if (!isPassMatch) {
    return res.status(403).json({ message: "Password not match" });
  }

  //*authorization
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: 60, //? 60 seconds. kalau mau 1 hari = "1d"
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
  });

  const newRefreshToken = new Auth({
    userId: user.id,
    refreshToken,
  });
  await newRefreshToken.save();

  return res.cookie("accessToken", accessToken, { httpOnly: true }).cookie("refreshtoken", refreshToken, { httpOnly: true }).status(200).json({ message: "Login Success" });
});

//? logout
app.get("/logout", async (req, res) => {
  const { refreshToken } = req.cookies;
  //* delete token di DB
  await Auth.findOneAndDelete({ refreshToken });
  return res.clearCookie("accessToken").clearCookie("refreshToken").json({ message: "Logout Success" });
});

//? resources endpoint
app.get("/resources", async (req, res) => {
  const { accessToken, refreshToken } = req.cookies;

  //* Cek apakah ada access token
  if (accessToken) {
    try {
      jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET as string);
      console.log("Access Token Valid");
      return res.json({ data: "Ini datanya..." });
    } catch (error) {
      //* kalau tidak valid  maka generate ulang
      if (!refreshToken) {
        console.log("Refresh Token Invalid");
        return res.status(401).json({ message: "Please Re-Login" });
      }

      try {
        //* check jika refresh token valid
        console.log("Verifikasi Refresh Token");
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string);
        //* jika valid, cek apakah ada di database
        console.log("Cek refresh token ke database");
        const activeRefreshToken = await Auth.findOne({ refreshToken });

        if (!activeRefreshToken) {
          console.log("Refresh Token tidak ada di database");
          return res.status(401).json({ message: "Please Re-Login" });
        }
        const payload = jwt.decode(refreshToken) as { id: string; name: string; email: string };

        console.log("Buat access token baru");
        const newAccesToken = jwt.sign({ id: payload?.id, name: payload.name, email: payload.email }, process.env.JWT_ACCESS_SECRET as string, {
          expiresIn: 300,
        });

        return res.cookie("accessToken", newAccesToken, { httpOnly: true }).json({ data: "Ini datanya..." });
      } catch (error) {
        return res.status(401).json({ message: "Please Re-Login" });
      }
    }
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
