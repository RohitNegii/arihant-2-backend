import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  console.error("Global Error Handler:", err);

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode) || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
};
