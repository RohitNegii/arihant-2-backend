import dotenv from "dotenv";
import path from "path";

// Load environment variables first
dotenv.config();

import bcrypt from "bcryptjs";
import { User } from "./models/User";
import { Cart } from "./models/Cart";
import { Category } from "./models/Category";
import { FAQ } from "./models/FAQ";
import { Product } from "./models/Product";
import { connectDB } from "./config/db";

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Seeding Categories
    const categoriesToSeed = [
      {
        name: "Rings",
        description: "Exquisite bands and diamond rings",
        sizes: ["4", "5", "6", "7", "8", "9", "10", "11", "12"],
        allowCustomSize: true
      },
      {
        name: "Bracelets/Bangles",
        description: "Bespoke bracelets and bangles",
        sizes: ["Small (S)", "Medium (M)", "Large (L)", "XL"],
        allowCustomSize: true
      },
      {
        name: "Necklaces",
        description: "Premium diamond and gold necklaces",
        sizes: ["14\"", "16\"", "18\"", "20\"", "22\"", "24\""],
        allowCustomSize: true
      },
      {
        name: "Chains",
        description: "Standard chains and gold links",
        sizes: ["16\"", "18\"", "20\"", "22\"", "24\"", "26\""],
        allowCustomSize: false
      },
      {
        name: "Earrings",
        description: "Luxury earrings and diamond studs",
        sizes: [],
        allowCustomSize: false
      },
      {
        name: "Pendants",
        description: "Bespoke diamond and gemstone pendants",
        sizes: [],
        allowCustomSize: true
      }
    ];

    for (const cat of categoriesToSeed) {
      const slug = cat.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
      const existingCat = await Category.findOne({ slug });
      if (!existingCat) {
        await Category.create({
          name: cat.name,
          slug,
          description: cat.description,
          sizes: cat.sizes,
          allowCustomSize: cat.allowCustomSize
        });
        console.log(`[Seed] Seeded category: ${cat.name}`);
      } else {
        existingCat.sizes = cat.sizes;
        existingCat.allowCustomSize = cat.allowCustomSize;
        await existingCat.save();
        console.log(`[Seed] Updated category settings for: ${cat.name}`);
      }
    }

    // Seeding FAQs
    const faqsToSeed = [
      {
        question: "How do I care for my custom Verdant Jewelry?",
        answer: "We recommend cleaning your jewelry with a very soft brush, warm water, and mild detergent. Dry thoroughly with a lint-free polishing cloth. Keep pieces separated in soft pouches when stored to prevent surface scratches.",
        order: 0,
      },
      {
        question: "Are the gemstones conflict-free and certified?",
        answer: "Yes, every single diamond and precious gem is sourced under conflict-free Kimberly Process promises, and GIA certificates are provided for qualifying center stones exceeding 0.3 carats.",
        order: 1,
      },
      {
        question: "Is international shipping fully insured?",
        answer: "Absolutely. We provide fully insured global shipping via specialized armored logistics couriers. A signature is always required upon delivery.",
        order: 2,
      },
      {
        question: "What is your warranty and resizing policy?",
        answer: "We provide a complimentary lifetime warranty against manufacturing defects. Bespoke bands include one free ring resizing within the first 12 months of purchase.",
        order: 3,
      }
    ];

    for (const item of faqsToSeed) {
      const existing = await FAQ.findOne({ question: item.question });
      if (!existing) {
        await FAQ.create(item);
        console.log(`[Seed] Seeded FAQ: ${item.question}`);
      }
    }

    const adminEmail = "adminn@yopmail.com";
    const adminPassword = "Admin@123";
    const adminPhone = "999999999";

    // Check if user already exists with this email
    const adminExists = await User.findOne({ email: adminEmail });
    if (adminExists) {
      console.log(`[Seed] Admin user with email '${adminEmail}' already exists.`);
    } else {
      // Generate hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      // Create the admin user in the database
      const adminUser = await User.create({
        name: "Geetej Viraasat Administrator",
        email: adminEmail,
        password: hashedPassword,
        phone: adminPhone,
        role: "admin"
      });

      // Lazily create cart for admin user
      await Cart.create({ customer: adminUser._id, items: [] });

      console.log("====================================================");
      console.log("  SUCCESS: Admin Account Seeded Successfully!");
      console.log(`  Name:      Geetej Viraasat Administrator`);
      console.log(`  Email:     ${adminEmail}`);
      console.log(`  Password:  ${adminPassword}`);
      console.log(`  Role:      ${adminUser.role}`);
      console.log("====================================================");
    }




    process.exit(0);
  } catch (error) {
    console.error("[Seed] Error seeding database:", error);
    process.exit(1);
  }
};

seedAdmin();
