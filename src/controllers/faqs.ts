import { Request, Response, NextFunction } from "express";
import { FAQ } from "../models/FAQ";
import { AuthRequest } from "../middlewares/auth";

// @desc    Get all FAQs
// @route   GET /api/faqs
// @access  Public
export const getFAQs = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const faqs = await FAQ.find().sort({ order: 1, createdAt: 1 });
    return res.json({ success: true, count: faqs.length, faqs });
  } catch (error) {
    next(error);
  }
};

// @desc    Create FAQ
// @route   POST /api/faqs
// @access  Private/Admin
export const createFAQ = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { question, answer, order } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, message: "Question and answer are required" });
    }

    const faq = await FAQ.create({
      question,
      answer,
      order: order !== undefined ? Number(order) : 0
    });

    return res.status(201).json({ success: true, faq });
  } catch (error) {
    next(error);
  }
};

// @desc    Update FAQ
// @route   PUT /api/faqs/:id
// @access  Private/Admin
export const updateFAQ = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { question, answer, order } = req.body;
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    if (question !== undefined) faq.question = question;
    if (answer !== undefined) faq.answer = answer;
    if (order !== undefined) faq.order = Number(order);

    await faq.save();
    return res.json({ success: true, faq });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/faqs/:id
// @access  Private/Admin
export const deleteFAQ = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);

    if (!faq) {
      return res.status(404).json({ success: false, message: "FAQ not found" });
    }

    return res.json({ success: true, message: "FAQ deleted successfully" });
  } catch (error) {
    next(error);
  }
};
