"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const user_schema_1 = require("./models/user.schema");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_schema_1 = require("./models/auth.schema");
dotenv_1.default.config();
mongoose_1.default
    .connect(process.env.MONGO_URI)
    .then(() => {
    console.log("MongoDB connected");
})
    .catch(() => {
    console.log("MongoDB not connected");
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
//? Register
app.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = req.body;
    //* input validation
    //* hash password
    const hashedPassword = yield bcrypt_1.default.hash(password, 13);
    //* payload untuk menampung data
    const newUser = {
        name,
        email,
        password: hashedPassword,
    };
    //* insert data ke DB
    const createUser = new user_schema_1.User(newUser);
    const data = yield createUser.save();
    return res.status(201).json({ message: "Register Success", data });
}));
//? Login
app.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body; //*data diterima dari body
    //* input validation
    if (!email || password.length < 8) {
        return res.status(403).json({ message: "Email minimal 8 caracters" });
    }
    //* find user by email
    const user = yield user_schema_1.User.findOne({ email });
    //* user not found
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    //* password validation dilakukan ketika usernya ada
    const isPassMatch = yield bcrypt_1.default.compare(password, user.password);
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
    const accessToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: 60, //? 60 seconds. kalau mau 1 hari = "1d"
    });
    const refreshToken = jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "7d",
    });
    const newRefreshToken = new auth_schema_1.Auth({
        userId: user.id,
        refreshToken,
    });
    yield newRefreshToken.save();
    return res.cookie("accessToken", accessToken, { httpOnly: true }).cookie("refreshtoken", refreshToken, { httpOnly: true }).status(200).json({ message: "Login Success" });
}));
//? logout
app.get("/logout", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { refreshToken } = req.cookies;
    //* delete token di DB
    yield auth_schema_1.Auth.findOneAndDelete({ refreshToken });
    return res.clearCookie("accessToken").clearCookie("refreshToken").json({ message: "Logout Success" });
}));
//? resources endpoint
app.get("/resources", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { accessToken, refreshToken } = req.cookies;
    //* Cek apakah ada access token
    if (accessToken) {
        try {
            jsonwebtoken_1.default.verify(accessToken, process.env.JWT_ACCESS_SECRET);
            console.log("Access Token Valid");
            return res.json({ data: "Ini datanya..." });
        }
        catch (error) {
            //* kalau tidak valid  maka generate ulang
            if (!refreshToken) {
                console.log("Refresh Token Invalid");
                return res.status(401).json({ message: "Please Re-Login" });
            }
            try {
                //* check jika refresh token valid
                console.log("Verifikasi Refresh Token");
                jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
                //* jika valid, cek apakah ada di database
                console.log("Cek refresh token ke database");
                const activeRefreshToken = yield auth_schema_1.Auth.findOne({ refreshToken });
                if (!activeRefreshToken) {
                    console.log("Refresh Token tidak ada di database");
                    return res.status(401).json({ message: "Please Re-Login" });
                }
                const payload = jsonwebtoken_1.default.decode(refreshToken);
                console.log("Buat access token baru");
                const newAccesToken = jsonwebtoken_1.default.sign({ id: payload === null || payload === void 0 ? void 0 : payload.id, name: payload.name, email: payload.email }, process.env.JWT_ACCESS_SECRET, {
                    expiresIn: 300,
                });
                return res.cookie("accessToken", newAccesToken, { httpOnly: true }).json({ data: "Ini datanya..." });
            }
            catch (error) {
                return res.status(401).json({ message: "Please Re-Login" });
            }
        }
    }
}));
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
