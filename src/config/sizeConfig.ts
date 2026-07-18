export interface SizeCategoryConfig {
  hasStandardSizes: boolean;
  standardSizes: string[];
  allowCustomSizeOption: boolean;
  customSizesAsTags: boolean;
  defaultHidden: boolean;
  label: string;
}

export const CATEGORY_SIZE_CONFIGS: Record<string, SizeCategoryConfig> = {
  rings: {
    hasStandardSizes: true,
    standardSizes: ["4", "5", "6", "7", "8", "9", "10", "11", "12"],
    allowCustomSizeOption: true,
    customSizesAsTags: false,
    defaultHidden: false,
    label: "Ring Sizes",
  },
  "bracelets/bangles": {
    hasStandardSizes: true,
    standardSizes: ["Small (S)", "Medium (M)", "Large (L)", "XL"],
    allowCustomSizeOption: true,
    customSizesAsTags: false,
    defaultHidden: false,
    label: "Bracelet/Bangle Sizes",
  },
  bracelets: {
    hasStandardSizes: true,
    standardSizes: ["Small (S)", "Medium (M)", "Large (L)", "XL"],
    allowCustomSizeOption: true,
    customSizesAsTags: false,
    defaultHidden: false,
    label: "Bracelet Sizes",
  },
  bangles: {
    hasStandardSizes: true,
    standardSizes: ["Small (S)", "Medium (M)", "Large (L)", "XL"],
    allowCustomSizeOption: true,
    customSizesAsTags: false,
    defaultHidden: false,
    label: "Bangle Sizes",
  },
  necklaces: {
    hasStandardSizes: true,
    standardSizes: ["14\"", "16\"", "18\"", "20\"", "22\"", "24\""],
    allowCustomSizeOption: true,
    customSizesAsTags: false,
    defaultHidden: false,
    label: "Necklace Lengths",
  },
  chains: {
    hasStandardSizes: true,
    standardSizes: ["16\"", "18\"", "20\"", "22\"", "24\"", "26\""],
    allowCustomSizeOption: false,
    customSizesAsTags: false,
    defaultHidden: false,
    label: "Chain Lengths",
  },
  earrings: {
    hasStandardSizes: false,
    standardSizes: [],
    allowCustomSizeOption: true,
    customSizesAsTags: false,
    defaultHidden: true,
    label: "Earring Sizes",
  },
  pendants: {
    hasStandardSizes: false,
    standardSizes: [],
    allowCustomSizeOption: true,
    customSizesAsTags: true,
    defaultHidden: false,
    label: "Pendant Sizes",
  },
};

export const DEFAULT_SIZE_CONFIG: SizeCategoryConfig = {
  hasStandardSizes: false,
  standardSizes: [],
  allowCustomSizeOption: true,
  customSizesAsTags: true,
  defaultHidden: false,
  label: "Product Sizes",
};

export const getSizeConfigByCategoryName = (categoryName: string): SizeCategoryConfig => {
  if (!categoryName) return DEFAULT_SIZE_CONFIG;
  const key = categoryName.toLowerCase().trim();
  
  if (CATEGORY_SIZE_CONFIGS[key]) {
    return CATEGORY_SIZE_CONFIGS[key];
  }
  
  for (const [configKey, config] of Object.entries(CATEGORY_SIZE_CONFIGS)) {
    if (key.includes(configKey) || configKey.includes(key)) {
      return config;
    }
  }
  
  return DEFAULT_SIZE_CONFIG;
};
