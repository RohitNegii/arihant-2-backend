import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    // optional support for cookie-based auth
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized to access this route" });
  }

  try {
    const secret = process.env.JWT_SECRET || "your_jwt_secret_key_here_for_development";
    const decoded = jwt.verify(token, secret) as { id: string };

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ success: false, message: "No user found with this id" });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account has been blocked. Please contact support." });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification error:", error);
    return res.status(401).json({ success: false, message: "Not authorized, token failed" });
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || "anonymous"}' is not authorized to access this resource`
      });
    }
    next();
  };
};

export const adminOnly = restrictTo("admin");
