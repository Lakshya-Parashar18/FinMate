import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,  // Ensure name is required
    },
    email: {
      type: String,
      unique: true,  // Ensure email is unique
      required: true,  // Ensure email is required
      lowercase: true,  // Store email in lowercase for consistency
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],  // Email format validation
    },
    password: {
      type: String,
      required: true,  // Ensure password is required
      minlength: 6,  // Minimum password length for security
    },
  },
  {
    timestamps: true,  // Automatically add createdAt and updatedAt fields
  }
);

export default mongoose.model("User", userSchema);
