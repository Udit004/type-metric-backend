import { Request, Response } from "express";
import { AppError } from "../../utils/AppError.js";

import {
	buildFrontendGoogleCallbackUrl,
	getCurrentUser,
	getGoogleLoginUrl,
	loginUser,
	loginWithGoogleCode,
	registerUser,
} from "./service.js";

function readBody(body: unknown): { name?: string; email?: string; password?: string } {
	if (!body || typeof body !== "object") {
		return {};
	}

	return body as { name?: string; email?: string; password?: string };
}

export async function register(req: Request, res: Response): Promise<void> {
	const { name, email, password } = readBody(req.body);

	if (!name || !email || !password) {
		throw new AppError(400, "name, email and password are required");
	}

	const result = await registerUser({ name, email, password });
	res.status(201).json(result);
}

export async function login(req: Request, res: Response): Promise<void> {
	const { email, password } = readBody(req.body);

	if (!email || !password) {
		throw new AppError(400, "email and password are required");
	}

	const result = await loginUser({ email, password });
	res.status(200).json(result);
}

export async function me(req: Request, res: Response): Promise<void> {
	if (!req.userId) {
		throw new AppError(401, "Unauthorized");
	}

	const user = await getCurrentUser(req.userId);
	res.status(200).json({ user });
}

export async function googleStart(_req: Request, res: Response): Promise<void> {
	res.redirect(getGoogleLoginUrl());
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
	const code = typeof req.query.code === "string" ? req.query.code : "";
	const state = typeof req.query.state === "string" ? req.query.state : "";

	if (!code || !state) {
		throw new AppError(400, "Missing Google code or state");
	}

	const result = await loginWithGoogleCode(code, state);
	res.redirect(buildFrontendGoogleCallbackUrl(result.token));
}
