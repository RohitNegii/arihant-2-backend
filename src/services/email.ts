import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.mailtrap.io";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpSecure = process.env.SMTP_SECURE === "true";
const rawEmailFrom = process.env.EMAIL_FROM || "";
const defaultReplyTo = process.env.REPLY_TO_EMAIL || "care@geetejviraasat.com";
const adminEmail = process.env.ADMIN_EMAIL || "admin@yopmail.com";

/**
 * Determine a safe 'From' email address to avoid SPF/DKIM/DMARC spam penalties.
 * When using Gmail SMTP (smtp.gmail.com), sending from an unverified custom domain
 * (e.g., @aurumjewelry.com or @geetejviraasat.com) causes SPF hard-fail (-all) and DKIM alignment failure,
 * which causes Gmail, Outlook, Yahoo, and Apple Mail to immediately direct the email into SPAM.
 * By matching the From address to the authenticated Gmail account (with the brand display name),
 * SPF, DKIM, and DMARC pass 100%, and deliverability lands directly in the Primary Inbox.
 */
function resolveEmailFrom(configuredFrom: string, host: string, user: string): string {
  if (!configuredFrom) {
    return user ? `"Geetej Viraasat" <${user}>` : '"Geetej Viraasat" <care@geetejviraasat.com>';
  }

  if (host.toLowerCase().includes("gmail") && user) {
    const match = configuredFrom.match(/<([^>]+)>/);
    const emailAddress = (match ? match[1] : configuredFrom).trim();

    if (!emailAddress.toLowerCase().endsWith("@gmail.com") && emailAddress.toLowerCase() !== user.toLowerCase()) {
      console.warn(
        `[Email Deliverability Warning] Gmail SMTP is configured with user "${user}", but EMAIL_FROM was set to "${configuredFrom}".\n` +
        `>> Sending via Gmail SMTP with a mismatched domain causes SPF/DKIM failures and routes emails to SPAM.\n` +
        `>> Automatically aligning sender to: "Geetej Viraasat" <${user}> with Reply-To set to "${defaultReplyTo}".`
      );
      return `"Geetej Viraasat" <${user}>`;
    }
  }

  return configuredFrom;
}

const emailFrom = resolveEmailFrom(rawEmailFrom, smtpHost, smtpUser);

let transporter: nodemailer.Transporter | null = null;
const isEmailConfigured = !!(smtpUser && smtpPass);

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      // Do not fail on valid self-signed certificates
      rejectUnauthorized: true,
    },
  });

  // Verify connection configuration
  transporter.verify((error) => {
    if (error) {
      console.error("[Email Service Warning] SMTP connection failed:", error.message);
    } else {
      console.log(`[Email Service] SMTP transporter ready to send emails via ${smtpHost} as ${emailFrom}.`);
    }
  });
} else {
  console.log(
    "\n========================================================================\n" +
    "[Email Service] SMTP credentials (SMTP_USER/SMTP_PASS) not configured.\n" +
    "Emails will be logged to the server console instead of being dispatched.\n" +
    "========================================================================\n"
  );
}

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  priority?: "high" | "normal" | "low";
}

export class EmailService {
  /**
   * Utility to generate clean, readable plain-text from HTML content.
   * Having a matching plain-text alternative is critical to prevent SpamAssassin
   * rules like MIME_HTML_ONLY and TVD_SPACE_RATIO from penalizing the email.
   */
  private stripHtmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*[\/]?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/h[1-6]>/gi, "\n\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&copy;/g, "©")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  private async sendMail(options: SendMailOptions): Promise<boolean> {
    const { to, subject, html, text, replyTo, priority } = options;
    const plainText = text || this.stripHtmlToText(html);

    if (isEmailConfigured && transporter) {
      try {
        await transporter.sendMail({
          from: emailFrom,
          to,
          replyTo: replyTo || defaultReplyTo,
          subject,
          text: plainText,
          html,
          headers: {
            "X-Mailer": "Geetej Viraasat Mailer",
            "Auto-Submitted": "auto-generated",
            "X-Auto-Response-Suppress": "OOF, AutoReply",
            ...(priority === "high"
              ? { "X-Priority": "1", Importance: "high", Priority: "urgent" }
              : {}),
          },
        });
        console.log(`[Email Service] Email successfully sent to ${to} | Subject: "${subject}"`);
        return true;
      } catch (error: any) {
        console.error(`[Email Service Error] Failed sending email to ${to}:`, error.message);
        this.logFallback(to, subject, html);
        return false;
      }
    } else {
      this.logFallback(to, subject, html);
      return true;
    }
  }

  private logFallback(to: string, subject: string, html: string): void {
    console.log(
      `\n======================= [MOCK EMAIL DISPATCH] =======================\n` +
      `To:      ${to}\n` +
      `Subject: ${subject}\n` +
      `From:    ${emailFrom}\n` +
      `---------------------------------------------------------------------\n` +
      `HTML Content Preview:\n` +
      `${html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 300)}...\n` +
      `=====================================================================\n`
    );
  }

  /**
   * Send verification OTP email to a user.
   * Uses anti-spam best practices:
   * - Clean subject line without all-caps brackets
   * - Hidden preheader text
   * - Multi-part plain-text alternative
   * - High priority transactional headers
   * - Clear sender identification and support contacts in footer
   */
  async sendOTP(email: string, code: string, type: string = "Verification"): Promise<boolean> {
    const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    const subject = `Your Geetej Viraasat ${capitalizedType} Code: ${code}`;

    const plainText = [
      `GEETEJ VIRAASAT - ${capitalizedType.toUpperCase()} CODE`,
      `====================================================`,
      ``,
      `Your verification code is: ${code}`,
      ``,
      `This code is valid for 5 minutes. For your security, do not share this code with anyone.`,
      ``,
      `If you did not request this verification, please disregard this email or contact support.`,
      ``,
      `----------------------------------------------------`,
      `Geetej Viraasat | Heritage & Fine Jewelry`,
      `Customer Support: ${defaultReplyTo}`,
      `Website: https://geetejviraasat.com`,
      `© ${new Date().getFullYear()} Geetej Viraasat. All rights reserved.`,
    ].join("\n");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <title>Geetej Viraasat - Verification Code</title>
        <style>
          body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 0; color: #0F4C3A; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; background-color: #FAF7F2; padding: 40px 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(15, 76, 58, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 76, 58, 0.04); }
          .header { background-color: #0F4C3A; padding: 36px 20px; text-align: center; border-bottom: 4px solid #C8A96A; }
          .logo { color: #C8A96A; font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 600; letter-spacing: 5px; text-transform: uppercase; margin: 0; }
          .logo-sub { color: #FAF7F2; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; opacity: 0.85; font-weight: 300; }
          .content { padding: 45px 35px; text-align: center; }
          .title { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 600; color: #0F4C3A; margin-bottom: 16px; }
          .description { font-size: 14px; color: #5D7A68; line-height: 1.8; margin-bottom: 25px; font-weight: 400; }
          .code-container { background-color: #FAF7F2; border: 2px dashed #C8A96A; border-radius: 8px; padding: 20px 35px; margin: 20px auto; display: inline-block; }
          .code { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 700; color: #0F4C3A; letter-spacing: 10px; margin: 0; }
          .expiry { font-size: 13px; color: #8C6D38; margin-top: 25px; line-height: 1.6; }
          .security-note { font-size: 12px; color: #7A8B7B; margin-top: 15px; line-height: 1.6; }
          .divider { height: 1px; background-color: rgba(15, 76, 58, 0.08); margin: 30px 0 20px 0; }
          .footer { background-color: #ffffff; padding: 0 35px 35px 35px; text-align: center; font-size: 12px; color: #5D7A68; line-height: 1.6; }
          .footer p { margin: 4px 0; }
          .footer a { color: #C8A96A; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <!-- Hidden Preheader for email clients -->
        <div style="display:none;font-size:1px;color:#FAF7F2;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
          Your verification code is ${code}. Valid for 5 minutes.
        </div>

        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1 class="logo">GEETEJ VIRAASAT</h1>
              <div class="logo-sub">Heritage & Fine Jewelry</div>
            </div>
            <div class="content">
              <h2 class="title">${capitalizedType} Code</h2>
              <p class="description">
                Thank you for choosing Geetej Viraasat. Please use the secure verification code below to complete your authentication.
              </p>
              <div class="code-container">
                <div class="code">${code}</div>
              </div>
              <p class="expiry">This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
              <p class="security-note">If you did not request this verification code, please ignore this email. Your account remains secure.</p>
              <div class="divider"></div>
            </div>
            <div class="footer">
              <p style="font-weight: 500; color: #0F4C3A;">Geetej Viraasat &bull; Heritage & Fine Jewelry</p>
              <p>Need assistance? Contact our care team at <a href="mailto:${defaultReplyTo}">${defaultReplyTo}</a></p>
              <p style="margin-top: 10px; font-size: 11px; color: #8F9D93;">You received this automated security message because an authentication request was made for ${email}.</p>
              <p style="font-size: 11px; color: #8F9D93;">&copy; ${new Date().getFullYear()} Geetej Viraasat. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({
      to: email,
      subject,
      html,
      text: plainText,
      priority: "high",
    });
  }

  /**
   * Send order confirmation email to customer.
   */
  async sendOrderConfirmation(email: string, order: any): Promise<boolean> {
    const subject = `Order Confirmation #${order.orderNumber} - Geetej Viraasat`;

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 16px 12px; border-bottom: 1px solid rgba(15, 76, 58, 0.05); font-size: 14px; color: #0F4C3A; font-weight: 500;">
          ${item.name}
          ${item.size ? `<br><span style="color: #5D7A68; font-size: 11px; font-weight: 400; text-transform: uppercase;">Size: ${item.size}</span>` : ""}
          ${item.variant ? `<br><span style="color: #5D7A68; font-size: 11px; font-weight: 400; text-transform: uppercase;">Variant: ${item.variant}</span>` : ""}
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid rgba(15, 76, 58, 0.05); font-size: 14px; text-align: center; color: #5D7A68;">${item.quantity}</td>
        <td style="padding: 16px 12px; border-bottom: 1px solid rgba(15, 76, 58, 0.05); font-size: 14px; text-align: right; color: #0F4C3A;">₹${item.price.toLocaleString("en-IN")}</td>
        <td style="padding: 16px 12px; border-bottom: 1px solid rgba(15, 76, 58, 0.05); font-size: 14px; text-align: right; color: #0F4C3A; font-weight: 600;">₹${(item.price * item.quantity).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const shipping = order.shippingAddress;
    const addressHtml = `
      <strong style="color: #0F4C3A; font-size: 14px;">${shipping.name}</strong><br>
      <span style="color: #5D7A68;">
        ${shipping.addressLine1}<br>
        ${shipping.addressLine2 ? `${shipping.addressLine2}<br>` : ""}
        ${shipping.city}, ${shipping.state} - ${shipping.postalCode}<br>
        ${shipping.country}<br>
        Phone: ${shipping.phone}
      </span>
    `;

    const itemsText = order.items.map((item: any) =>
      `- ${item.name}${item.size ? ` (Size: ${item.size})` : ""}${item.variant ? ` (Variant: ${item.variant})` : ""} x ${item.quantity} = ₹${(item.price * item.quantity).toLocaleString("en-IN")}`
    ).join("\n");

    const plainText = [
      `GEETEJ VIRAASAT - ORDER CONFIRMATION`,
      `====================================================`,
      `Thank you for your purchase from Geetej Viraasat!`,
      `Order Number: #${order.orderNumber}`,
      ``,
      `ORDER ITEMS:`,
      itemsText,
      ``,
      `Subtotal: ₹${order.subtotal.toLocaleString("en-IN")}`,
      order.taxAmount ? `Tax: ₹${order.taxAmount.toLocaleString("en-IN")}` : ``,
      `Shipping: ${order.shippingAmount === 0 ? "Free Shipping" : `₹${order.shippingAmount.toLocaleString("en-IN")}`}`,
      `Grand Total: ₹${order.grandTotal.toLocaleString("en-IN")}`,
      ``,
      `SHIPPING ADDRESS:`,
      `${shipping.name}`,
      `${shipping.addressLine1}`,
      shipping.addressLine2 ? `${shipping.addressLine2}` : ``,
      `${shipping.city}, ${shipping.state} - ${shipping.postalCode}`,
      `${shipping.country}`,
      `Phone: ${shipping.phone}`,
      ``,
      `We will email you the tracking details as soon as your items ship.`,
      `If you have any questions, reach out to our team at ${defaultReplyTo}.`,
      ``,
      `----------------------------------------------------`,
      `Geetej Viraasat | Heritage & Fine Jewelry`,
      `Website: https://geetejviraasat.com`,
      `© ${new Date().getFullYear()} Geetej Viraasat. All rights reserved.`,
    ].filter(Boolean).join("\n");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <title>Geetej Viraasat - Order Confirmation</title>
        <style>
          body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 0; color: #0F4C3A; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; background-color: #FAF7F2; padding: 40px 0; }
          .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(15, 76, 58, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 76, 58, 0.04); }
          .header { background-color: #0F4C3A; padding: 36px 20px; text-align: center; border-bottom: 4px solid #C8A96A; }
          .logo { color: #C8A96A; font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 600; letter-spacing: 5px; text-transform: uppercase; margin: 0; }
          .logo-sub { color: #FAF7F2; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; opacity: 0.85; font-weight: 300; }
          .content { padding: 40px 35px; }
          .thankyou { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 600; color: #0F4C3A; text-align: center; margin-bottom: 10px; }
          .subheading { font-size: 14px; color: #5D7A68; text-align: center; margin-bottom: 35px; line-height: 1.6; }
          .order-details-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .order-details-table th { padding: 12px 10px; border-bottom: 2px solid rgba(15, 76, 58, 0.1); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #5D7A68; text-align: left; }
          .totals-table { width: 100%; border-collapse: collapse; margin-bottom: 35px; border-top: 1px solid rgba(15, 76, 58, 0.1); padding-top: 15px; }
          .totals-table td { padding: 10px 12px; font-size: 14px; }
          .totals-label { text-align: right; color: #5D7A68; width: 75%; }
          .totals-val { text-align: right; font-weight: 500; color: #0F4C3A; }
          .grand-total-label { text-align: right; font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: bold; color: #0F4C3A; border-top: 2px solid #C8A96A; padding-top: 15px !important; }
          .grand-total-val { text-align: right; font-size: 18px; font-weight: 700; color: #0F4C3A; border-top: 2px solid #C8A96A; padding-top: 15px !important; }
          .section-title { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: 600; color: #0F4C3A; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
          .card-block { background-color: #FAF7F2; border: 1px solid rgba(15, 76, 58, 0.05); border-radius: 8px; padding: 20px; font-size: 13px; line-height: 1.7; border-left: 3px solid #C8A96A; }
          .footer { background-color: #ffffff; padding: 25px 35px 35px 35px; text-align: center; border-top: 1px solid rgba(15, 76, 58, 0.05); font-size: 12px; color: #5D7A68; line-height: 1.6; }
          .footer a { color: #C8A96A; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <!-- Hidden Preheader -->
        <div style="display:none;font-size:1px;color:#FAF7F2;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
          Your order #${order.orderNumber} is confirmed. Thank you for your purchase from Geetej Viraasat.
        </div>

        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1 class="logo">GEETEJ VIRAASAT</h1>
              <div class="logo-sub">Heritage & Fine Jewelry</div>
            </div>
            <div class="content">
              <div class="thankyou">Order Confirmed</div>
              <div class="subheading">Thank you for your purchase from Geetej Viraasat. Your order <strong>#${order.orderNumber}</strong> has been received.</div>

              <h3 class="section-title">Order Items</h3>
              <table class="order-details-table">
                <thead>
                  <tr>
                    <th style="width: 50%;">Item</th>
                    <th style="width: 10%; text-align: center;">Qty</th>
                    <th style="width: 20%; text-align: right;">Price</th>
                    <th style="width: 20%; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <table class="totals-table">
                <tr>
                  <td class="totals-label">Subtotal:</td>
                  <td class="totals-val">₹${order.subtotal.toLocaleString("en-IN")}</td>
                </tr>
                ${order.taxAmount ? `
                <tr>
                  <td class="totals-label">Tax:</td>
                  <td class="totals-val">₹${order.taxAmount.toLocaleString("en-IN")}</td>
                </tr>
                ` : ""}
                <tr>
                  <td class="totals-label">Shipping:</td>
                  <td class="totals-val">${order.shippingAmount === 0 ? "Free Shipping" : `₹${order.shippingAmount.toLocaleString("en-IN")}`}</td>
                </tr>
                <tr>
                  <td class="grand-total-label">Grand Total:</td>
                  <td class="grand-total-val">₹${order.grandTotal.toLocaleString("en-IN")}</td>
                </tr>
              </table>

              <h3 class="section-title">Shipping Address</h3>
              <div class="card-block">
                ${addressHtml}
              </div>
            </div>
            <div class="footer">
              <p>We will email you the tracking details as soon as your items ship.</p>
              <p>Have questions? Contact our customer care team at <a href="mailto:${defaultReplyTo}">${defaultReplyTo}</a>.</p>
              <p style="margin-top: 15px; font-size: 11px; color: #8F9D93;">&copy; ${new Date().getFullYear()} Geetej Viraasat. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({ to: email, subject, html, text: plainText });
  }

  /**
   * Send contact inquiry notification to admin.
   */
  async sendContactInquiryNotification(inquiry: any): Promise<boolean> {
    const subject = `New Contact Inquiry: ${inquiry.name} - Geetej Viraasat`;

    const plainText = [
      `NEW CONTACT INQUIRY RECEIVED`,
      `====================================================`,
      `Name:    ${inquiry.name}`,
      `Email:   ${inquiry.email}`,
      `Phone:   ${inquiry.phone || "Not provided"}`,
      `Subject: ${inquiry.subject}`,
      ``,
      `Message:`,
      `${inquiry.message}`,
      ``,
      `----------------------------------------------------`,
      `Sent via Geetej Viraasat Website Contact Form`,
    ].join("\n");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="x-apple-disable-message-reformatting">
        <title>New Contact Inquiry</title>
        <style>
          body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF7F2; padding: 30px; margin: 0; color: #0F4C3A; -webkit-font-smoothing: antialiased; }
          .card { max-width: 600px; margin: 0 auto; background: white; border: 1px solid rgba(15, 76, 58, 0.08); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(15, 76, 58, 0.04); }
          .header { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; border-bottom: 2px solid #C8A96A; padding-bottom: 15px; margin-bottom: 30px; color: #0F4C3A; text-align: center; letter-spacing: 1px; }
          .field { margin-bottom: 20px; }
          .label { font-weight: 600; color: #5D7A68; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
          .value { font-size: 15px; margin-top: 5px; color: #0F4C3A; font-weight: 500; }
          .message-box { background: #FAF7F2; border: 1px solid rgba(15, 76, 58, 0.05); border-left: 3px solid #C8A96A; border-radius: 4px; padding: 15px 20px; white-space: pre-wrap; margin-top: 5px; color: #0F4C3A; font-size: 14px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <!-- Hidden Preheader -->
        <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
          New inquiry from ${inquiry.name}: ${inquiry.subject}
        </div>

        <div class="card">
          <div class="header">New Contact Inquiry Received</div>
          
          <div class="field">
            <div class="label">Name</div>
            <div class="value">${inquiry.name}</div>
          </div>
          
          <div class="field">
            <div class="label">Email Address</div>
            <div class="value"><a href="mailto:${inquiry.email}" style="color: #C8A96A; text-decoration: none;">${inquiry.email}</a></div>
          </div>
          
          <div class="field">
            <div class="label">Phone Number</div>
            <div class="value">${inquiry.phone || "Not provided"}</div>
          </div>

          <div class="field">
            <div class="label">Subject</div>
            <div class="value" style="font-style: italic;">${inquiry.subject}</div>
          </div>

          <div class="field">
            <div class="label">Message</div>
            <div class="message-box">${inquiry.message}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({
      to: adminEmail,
      subject,
      html,
      text: plainText,
      replyTo: inquiry.email,
    });
  }
}

export const emailService = new EmailService();
