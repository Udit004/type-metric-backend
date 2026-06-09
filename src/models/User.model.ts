import bcrypt from "bcryptjs";
import { HydratedDocument, Model, Schema, model } from "mongoose";

export interface IUser {
	name: string;
	email: string;
	password: string;
	googleId?: string;
	bio: string;
	tagline: string;
	country: string;
	favoriteMode: "solo" | "multiplayer" | "hybrid";
	avatarColor: string;
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
