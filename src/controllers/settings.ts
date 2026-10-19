import { Request, Response, NextFunction } from "express";
import { Setting } from "../models/Setting";

// @desc    Get global discount settings
// @route   GET /api/settings/discount
// @access  Public
export const getDiscountSettings = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    let setting = await Setting.findOne({ key: "discount" });
    
    if (!setting) {
      // Return default configuration if not set yet
      return res.json({
        success: true,
        discount: {
          percentage: 0,
          enabled: false
        }
      });
    }

    return res.json({
      success: true,
      discount: setting.value
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update global discount settings
// @route   PUT /api/settings/discount
// @access  Private/Admin
export const updateDiscountSettings = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { percentage, enabled } = req.body;

    // Validation
    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({
        success: false,
        message: "Discount percentage must be a number between 0 and 100"
      });
    }

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Enabled status must be a boolean"
      });
    }

    const value = {
      percentage: pct,
      enabled
    };

    let setting = await Setting.findOne({ key: "discount" });
    if (setting) {
      setting.value = value;
      await setting.save();
    } else {
      setting = await Setting.create({
        key: "discount",
        value
      });
    }

    return res.json({
      success: true,
      message: "Discount settings updated successfully",
      discount: setting.value
    });
  } catch (error) {
    next(error);
  }
};

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

