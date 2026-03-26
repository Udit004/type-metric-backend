import { Request, Response } from "express";

import { getCurrentUser, loginUser, registerUser } from "./service.js";

function readBody(body: unknown): { name?: string; email?: string; password?: string } {
	if (!body || typeof body !== "object") {
		return {};
	}

	return body as { name?: string; email?: string; password?: string };
}

export async function register(req: Request, res: Response): Promise<void> {
	try {
		const { name, email, password } = readBody(req.body);

		if (!name || !email || !password) {
			res.status(400).json({ message: "name, email and password are required" });
			return;
		}

		const result = await registerUser({ name, email, password });
		res.status(201).json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Registration failed";
		res.status(400).json({ message });
	}
}

export async function login(req: Request, res: Response): Promise<void> {
	try {
		const { email, password } = readBody(req.body);

		if (!email || !password) {
			res.status(400).json({ message: "email and password are required" });
			return;
		}

		const result = await loginUser({ email, password });
		res.status(200).json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Login failed";
		res.status(401).json({ message });
	}
}

export async function me(req: Request, res: Response): Promise<void> {
	try {
		if (!req.userId) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const user = await getCurrentUser(req.userId);
		res.status(200).json({ user });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to fetch user";
		res.status(404).json({ message });
	}
}
