import jwt from "jsonwebtoken";

import User from "../../models/User.model.js";

interface RegisterInput {
	name: string;
	email: string;
	password: string;
}

interface LoginInput {
	email: string;
	password: string;
}

interface AuthUser {
	id: string;
	name: string;
	email: string;
}

interface AuthResult {
	token: string;
	user: AuthUser;
}

function getJwtSecret(): string {
	const secret = process.env.JWT_SECRET;

	if (!secret) {
		throw new Error("JWT_SECRET is not defined in environment variables");
	}

	return secret;
}

function signToken(userId: string): string {
	return jwt.sign({ userId }, getJwtSecret(), { expiresIn: "7d" });
}

function toAuthUser(user: { _id: unknown; name: string; email: string }): AuthUser {
	return {
		id: String(user._id),
		name: user.name,
		email: user.email,
	};
}

export async function registerUser(payload: RegisterInput): Promise<AuthResult> {
	const existingUser = await User.findOne({ email: payload.email.toLowerCase() });

	if (existingUser) {
		throw new Error("User already exists with this email");
	}

	const user = await User.create({
		name: payload.name,
		email: payload.email.toLowerCase(),
		password: payload.password,
	});

	const token = signToken(String(user._id));

	return {
		token,
		user: toAuthUser(user),
	};
}

export async function loginUser(payload: LoginInput): Promise<AuthResult> {
	const user = await User.findOne({ email: payload.email.toLowerCase() });

	if (!user) {
		throw new Error("Invalid email or password");
	}

	const isPasswordValid = await user.comparePassword(payload.password);

	if (!isPasswordValid) {
		throw new Error("Invalid email or password");
	}

	const token = signToken(String(user._id));

	return {
		token,
		user: toAuthUser(user),
	};
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
	const user = await User.findById(userId).select("name email");

	if (!user) {
		throw new Error("User not found");
	}

	return toAuthUser(user);
}
