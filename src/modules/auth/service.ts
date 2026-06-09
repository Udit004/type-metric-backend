import crypto from "crypto";
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

interface GoogleProfileInput {
	googleId: string;
	email: string;
	name: string;
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

function getGoogleClientId(): string {
	const clientId = process.env.GOOGLE_CLIENT_ID;

	if (!clientId) {
		throw new Error("GOOGLE_CLIENT_ID is not defined in environment variables");
	}

	return clientId;
}

function getGoogleClientSecret(): string {
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

	if (!clientSecret) {
		throw new Error("GOOGLE_CLIENT_SECRET is not defined in environment variables");
	}

	return clientSecret;
}

function getGoogleRedirectUri(): string {
	return process.env.GOOGLE_REDIRECT_URI || "https://type-metric-backend.onrender.com/auth/google/callback";
}

function getFrontendAppUrl(): string {
	return process.env.FRONTEND_APP_URL || "http://localhost:3000";
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

function createOAuthPassword(): string {
	return `google-${crypto.randomBytes(24).toString("hex")}`;
}

function signOAuthState(provider: "google"): string {
	return jwt.sign({ provider }, getJwtSecret(), { expiresIn: "10m" });
}

function verifyOAuthState(state: string): void {
	const decoded = jwt.verify(state, getJwtSecret()) as jwt.JwtPayload;

	if (decoded.provider !== "google") {
		throw new Error("Invalid OAuth state");
	}
}

function buildGoogleAuthUrl(stateToken: string): string {
	const searchParams = new URLSearchParams({
		client_id: getGoogleClientId(),
		redirect_uri: getGoogleRedirectUri(),
		response_type: "code",
		scope: "openid email profile",
		access_type: "offline",
		prompt: "consent",
		state: stateToken,
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;
}

async function exchangeGoogleCode(code: string): Promise<{ access_token: string }> {
	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			code,
			client_id: getGoogleClientId(),
			client_secret: getGoogleClientSecret(),
			redirect_uri: getGoogleRedirectUri(),
			grant_type: "authorization_code",
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to exchange Google authorization code");
	}

	return (await response.json()) as { access_token: string };
}

async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfileInput> {
	const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch Google profile");
	}

	const profile = (await response.json()) as { sub: string; email: string; name: string };

	return {
		googleId: profile.sub,
		email: profile.email,
		name: profile.name,
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

export function getGoogleLoginUrl(): string {
	const state = signOAuthState("google");
	return buildGoogleAuthUrl(state);
}

export function buildFrontendGoogleCallbackUrl(token: string): string {
	const callbackUrl = new URL("/auth/google/callback", getFrontendAppUrl());
	callbackUrl.searchParams.set("token", token);
	return callbackUrl.toString();
}

export async function loginWithGoogleCode(code: string, state: string): Promise<AuthResult> {
	verifyOAuthState(state);

	const tokenResponse = await exchangeGoogleCode(code);
	const profile = await fetchGoogleProfile(tokenResponse.access_token);
	const normalizedEmail = profile.email.toLowerCase();

	let user = await User.findOne({
		$or: [{ googleId: profile.googleId }, { email: normalizedEmail }],
	});

	if (!user) {
		user = await User.create({
			name: profile.name || "Google User",
			email: normalizedEmail,
			password: createOAuthPassword(),
			googleId: profile.googleId,
		});
	} else {
		let changed = false;

		if (!user.googleId) {
			user.googleId = profile.googleId;
			changed = true;
		}

		if (!user.name && profile.name) {
			user.name = profile.name;
			changed = true;
		}

		if (changed) {
			await user.save();
		}
	}

	const token = signToken(String(user._id));

	return {
		token,
		user: toAuthUser(user),
	};
}
