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
