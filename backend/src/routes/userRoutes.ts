import express from "express";
import { login, register, updateMe } from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/uploadMiddleware";
import { validateUserLogin, validateUserRegister, validateUserUpdate } from "../middlewares/userMiddleware";
import { Router } from "express";
const router: Router = express.Router();

router.post("/login", validateUserLogin, login);
router.post("/register", validateUserRegister, register);
router.patch("/me", authMiddleware, upload.single('profile_pic'), validateUserUpdate, updateMe);

export default router;
