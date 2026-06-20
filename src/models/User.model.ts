import bcrypt from "bcryptjs";
import { HydratedDocument, Model, Schema, model } from "mongoose";

export interface IUser {
	name: string;
	displayName: string;
	email: string;
	password: string;
	googleId?: string;
	username: string;
	bio: string;
	tagline: string;
	country: string;
	timezone: string;
	profileVisibility: "public" | "private";
	favoriteMode: "solo" | "multiplayer" | "hybrid";
	avatarColor: string;
	avatarImageUrl: string;
	gamificationVersion: number;
	usernameUpdatedAt: Date | null;
	usernameChangeCount: number;
}

interface IUserMethods {
	comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		displayName: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		password: {
			type: String,
			required: true,
			minlength: 6,
		},
		googleId: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
		},
		username: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			index: true,
		},
		bio: {
			type: String,
			default: "",
			maxlength: 220,
			trim: true,
		},
		tagline: {
			type: String,
			default: "",
			maxlength: 80,
			trim: true,
		},
		country: {
			type: String,
			default: "",
			maxlength: 56,
			trim: true,
		},
		timezone: {
			type: String,
			default: "UTC",
			trim: true,
		},
		profileVisibility: {
			type: String,
			enum: ["public", "private"],
			required: true,
			default: "public",
		},
		favoriteMode: {
			type: String,
			enum: ["solo", "multiplayer", "hybrid"],
			required: true,
			default: "hybrid",
		},
		avatarColor: {
			type: String,
			required: true,
			default: "#22d3ee",
			trim: true,
		},
		avatarImageUrl: {
			type: String,
			required: true,
			default: "",
			trim: true,
		},
		gamificationVersion: {
			type: Number,
			required: true,
			default: 1,
			min: 1,
		},
		usernameUpdatedAt: {
			type: Date,
			default: null,
		},
		usernameChangeCount: {
			type: Number,
			required: true,
			default: 0,
			min: 0,
		},
	},
	{
		timestamps: true,
	}
);

userSchema.pre("save", async function onSave() {
	if (!this.isModified("password")) {
		return;
	}

	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

userSchema.method("comparePassword", async function comparePassword(candidatePassword: string) {
	return bcrypt.compare(candidatePassword, this.password);
});

const User = model<IUser, UserModel>("User", userSchema);

export default User;
