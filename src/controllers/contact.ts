import { Request, Response, NextFunction } from "express";
import { Contact } from "../models/Contact";
import { emailService } from "../services/email";


// Helper regex to validate email address format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Submit a contact inquiry
// @route   POST /api/contact
// @access  Public
export const createContactInquiry = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Required fields validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Full Name, Email Address, Subject, and Message are required."
      });
    }

    // Email format validation
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address."
      });
    }

    // Character limits validation to prevent spam/XSS payloads
    if (name.length > 100) {
      return res.status(400).json({ success: false, message: "Full Name cannot exceed 100 characters." });
    }
    if (email.length > 100) {
      return res.status(400).json({ success: false, message: "Email Address cannot exceed 100 characters." });
    }
    if (phone && phone.length > 30) {
      return res.status(400).json({ success: false, message: "Phone Number cannot exceed 30 characters." });
    }
    if (subject.length > 200) {
      return res.status(400).json({ success: false, message: "Subject cannot exceed 200 characters." });
    }
    if (message.length > 3000) {
      return res.status(400).json({ success: false, message: "Message cannot exceed 3000 characters." });
    }

    // Create the inquiry in database
    const contact = await Contact.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : "",
      subject: subject.trim(),
      message: message.trim()
    });

    // Send contact notification to admin
    try {
      await emailService.sendContactInquiryNotification(contact);
    } catch (err) {
      console.error(`[Contact] Failed to send contact inquiry notification:`, err);
    }

    return res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully.",
      contact
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact inquiries
// @route   GET /api/admin/contact
// @access  Private/Admin
export const getContactInquiries = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const inquiries = await Contact.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      inquiries
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact inquiry
// @route   DELETE /api/admin/contact/:id
// @access  Private/Admin
export const deleteContactInquiry = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const inquiry = await Contact.findByIdAndDelete(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ success: false, message: "Contact inquiry not found." });
    }

    return res.json({
      success: true,
      message: "Inquiry deleted successfully."
    });
  } catch (error) {
    next(error);
  }
};
