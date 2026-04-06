const { Router } = require('express')
const authController = require("../controllers/auth.controller")
const authMiddleware = require("../middlewares/auth.middleware")
const { validate } = require("../middlewares/validate")
const { registerBody, loginBody, forgotPasswordBody, resetPasswordBody } = require("../validators/auth.schemas")

const authRouter = Router()

/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
authRouter.post("/register", validate({ body: registerBody }), authController.registerUserController)


/**
 * @route POST /api/auth/login
 * @description login user with email and password
 * @access Public
 */
authRouter.post("/login", validate({ body: loginBody }), authController.loginUserController)

/**
 * @route POST /api/auth/forgot-password
 * @description send password reset email
 * @access Public
 */
authRouter.post("/forgot-password", validate({ body: forgotPasswordBody }), authController.requestPasswordResetController)

/**
 * @route POST /api/auth/reset-password
 * @description reset password using token
 * @access Public
 */
authRouter.post("/reset-password", validate({ body: resetPasswordBody }), authController.resetPasswordController)

/**
 * @route GET /api/auth/logout
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
authRouter.get("/logout", authController.logoutUserController)


/**
 * @route GET /api/auth/get-me
 * @description get the current logged in user details
 * @access private
 */
authRouter.get("/get-me", authMiddleware.authUser, authController.getMeController)


module.exports = authRouter
