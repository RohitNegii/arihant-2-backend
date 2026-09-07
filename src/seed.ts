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
import { HomeMedia } from "./models/HomeMedia";
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

    // Seeding homepage media with the photos the storefront currently ships
    const homeMediaToSeed = [
      { slot: "wall", url: "/images/royal-peacock-drops.webp", title: "Royal Peacock Drops", alt: "Gold carved peacock earrings with pink kundan petals and pearl clusters" },
      { slot: "wall", url: "/images/chain-on-table.webp", title: "Atelier Chain Bracelets", alt: "Four gold and silver link bracelets hung over the rim of a coupe glass" },
      { slot: "wall", url: "/images/ruby-pearl-chandbali.webp", title: "Ruby Pearl Chandbali", alt: "Oxidised silver chandbali earrings with a ruby cluster crest and pearl heart" },
      { slot: "wall", url: "/images/lapis-bloom-danglers.webp", title: "Lapis Bloom Danglers", alt: "Silver flower studs with lapis lazuli triangle drops guarded by twin parrots" },
      { slot: "wall", url: "/images/abalone-elephant-danglers.webp", title: "Abalone Elephant Danglers", alt: "Abalone shell lotus earrings carried by golden elephants with pearl tassels" },
      { slot: "wall", url: "/images/jade-medallion-drops.webp", title: "Jade Medallion Drops", alt: "Round green jade medallion earrings framed by silver blossoms" },

      { slot: "plinth", url: "/images/royal-peacock-drops.webp", title: "Royal Peacock Drops", alt: "Gold carved peacock earrings with pink kundan petals and pearl clusters" },
      { slot: "plinth", url: "/images/chain-on-table.webp", title: "Atelier Chain Bracelets", alt: "Four gold and silver link bracelets hung over the rim of a coupe glass" },
      { slot: "plinth", url: "/images/emerald-goddess-drops.webp", title: "Emerald Goddess Drops", alt: "Antique silver goddess earrings crowned with rubies above carved emerald teardrops" },
      { slot: "plinth", url: "/images/turquoise-chandelier-drops.webp", title: "Turquoise Chandelier Drops", alt: "Oxidised silver chandelier earrings lined with turquoise beads, ruby kundan and pearl tassels" },
      { slot: "plinth", url: "/images/peacock-hexagon-studs.webp", title: "Peacock Hexagon Studs", alt: "Two-tone hexagonal studs with a golden peacock relief and fluted silver drop" },
      { slot: "plinth", url: "/images/ruby-pearl-chandbali.webp", title: "Ruby Pearl Chandbali", alt: "Oxidised silver chandbali earrings with a ruby cluster crest and pearl heart" },
      { slot: "plinth", url: "/images/lapis-bloom-danglers.webp", title: "Lapis Bloom Danglers", alt: "Silver flower studs with lapis lazuli triangle drops guarded by twin parrots" },
      { slot: "plinth", url: "/images/abalone-elephant-danglers.webp", title: "Abalone Elephant Danglers", alt: "Abalone shell lotus earrings carried by golden elephants with pearl tassels" },
      { slot: "plinth", url: "/images/jade-medallion-drops.webp", title: "Jade Medallion Drops", alt: "Round green jade medallion earrings framed by silver blossoms" },

      { slot: "moments", url: "/images/ring-with-book.webp", title: "Enamel Elephant Ring", alt: "A gold and oxblood enamel elephant ring standing on a white page beside an open book and dried gypsophila" },
      { slot: "moments", url: "/images/rings-in-zar.webp", title: "Solitaire and Curb Chain", alt: "A gold solitaire ring inside a glass phial with a heavy curb chain spilling from its mouth, on dark silk" },

      { slot: "finale", url: "/images/emerald-goddess-drops.webp", title: "Emerald Goddess Drops", alt: "Antique silver goddess earrings crowned with rubies above carved emerald teardrops" },
      { slot: "finale", url: "/images/ring-and-hand.webp", title: "Kundan Cocktail Rings", alt: "A hand wearing two antique gold cocktail rings and a diamond cuff" },

      { slot: "bench", url: "/images/emerald-goddess-drops.webp", title: "Emerald Goddess Drops", alt: "Antique silver goddess earrings crowned with rubies above carved emerald teardrops" }
    ];

    const orderBySlot: Record<string, number> = {};
    for (const item of homeMediaToSeed) {
      const order = orderBySlot[item.slot] ?? 0;
      orderBySlot[item.slot] = order + 1;

      const existing = await HomeMedia.findOne({ slot: item.slot, url: item.url });
      if (!existing) {
        await HomeMedia.create({ ...item, order, isActive: true });
        console.log(`[Seed] Seeded homepage media: ${item.slot} / ${item.title}`);
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
