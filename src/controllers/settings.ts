import { Request, Response, NextFunction } from "express";
import { Setting } from "../models/Setting";

// Helper function to get clean business WhatsApp number
export const getBusinessWhatsAppNumber = async (): Promise<string> => {
  try {
    const setting = await Setting.findOne({ key: "whatsapp" });
    const rawNumber = setting?.value?.number || process.env.BUSINESS_WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER || "919876543210";
    // Strip non-digit characters
    const digitsOnly = String(rawNumber).replace(/\D/g, "");
    // If standard 10 digit Indian number without country code, prepend 91
    if (digitsOnly.length === 10) {
      return `91${digitsOnly}`;
    }
    return digitsOnly || "919876543210";
  } catch {
    return "919876543210";
  }
};

// @desc    Get WhatsApp business configuration
// @route   GET /api/settings/whatsapp
// @access  Public
export const getWhatsAppSettings = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    let setting = await Setting.findOne({ key: "whatsapp" });

    if (!setting) {
      const defaultNumber = process.env.BUSINESS_WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER || "919876543210";
      return res.json({
        success: true,
        whatsapp: {
          number: defaultNumber,
          enabled: true
        }
      });
    }

    return res.json({
      success: true,
      whatsapp: setting.value
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update WhatsApp business configuration
// @route   PUT /api/settings/whatsapp
// @access  Private/Admin
export const updateWhatsAppSettings = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { number, enabled } = req.body;

    if (!number || typeof number !== "string" || number.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid WhatsApp phone number"
      });
    }

    const value = {
      number: number.trim(),
      enabled: enabled !== undefined ? !!enabled : true
    };

    let setting = await Setting.findOne({ key: "whatsapp" });
    if (setting) {
      setting.value = value;
      await setting.save();
    } else {
      setting = await Setting.create({
        key: "whatsapp",
        value
      });
    }

    return res.json({
      success: true,
      message: "WhatsApp business settings updated successfully",
      whatsapp: setting.value
    });
  } catch (error) {
    next(error);
  }
};

