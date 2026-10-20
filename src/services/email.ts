import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.mailtrap.io";
const smtpPort = parseInt(process.env.SMTP_PORT || "2525", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpSecure = process.env.SMTP_SECURE === "true";
const emailFrom = process.env.EMAIL_FROM || '"Geetej Viraasat" <noreply@geetejviraasat.com>';
const adminEmail = process.env.ADMIN_EMAIL || "admin@yopmail.com";

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
  });

  // Verify connection configuration
  transporter.verify((error) => {
    if (error) {
      console.error("[Email Service Warning] SMTP connection failed:", error.message);
    } else {
      console.log("[Email Service] SMTP transporter ready to send emails.");
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
}

export class EmailService {
  private async sendMail(options: SendMailOptions): Promise<boolean> {
    const { to, subject, html, text } = options;

    if (isEmailConfigured && transporter) {
      try {
        await transporter.sendMail({
          from: emailFrom,
          to,
          subject,
          text: text || "This email requires an HTML compatible email viewer.",
          html,
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
   */
  async sendOTP(email: string, code: string, type: string = "Verification"): Promise<boolean> {
    const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
    const subject = `[GEETEJ VIRAASAT] ${capitalizedType} Code: ${code}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Geetej Viraasat - Verification Code</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Montserrat', Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 0; color: #0F4C3A; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; background-color: #FAF7F2; padding: 40px 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(15, 76, 58, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 76, 58, 0.04); }
          .header { background-color: #0F4C3A; padding: 40px 20px; text-align: center; border-bottom: 4px solid #C8A96A; }
          .logo { color: #C8A96A; font-family: 'Playfair Display', 'Georgia', serif; font-size: 28px; font-weight: 500; letter-spacing: 6px; text-transform: uppercase; margin: 0; }
          .logo-sub { color: #FAF7F2; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; opacity: 0.8; font-weight: 300; }
          .content { padding: 50px 40px; text-align: center; }
          .title { font-family: 'Playfair Display', 'Georgia', serif; font-size: 22px; font-weight: 600; color: #0F4C3A; margin-bottom: 20px; }
          .description { font-size: 15px; color: #5D7A68; line-height: 1.8; margin-bottom: 35px; font-weight: 400; }
          .code-container { background-color: rgba(200, 169, 106, 0.08); border: 1px solid rgba(200, 169, 106, 0.3); border-radius: 8px; padding: 25px; margin: 25px auto; display: inline-block; min-width: 200px; }
          .code { font-family: 'Playfair Display', 'Georgia', serif; font-size: 38px; font-weight: 700; color: #0F4C3A; letter-spacing: 8px; margin: 0; }
          .expiry { font-size: 13px; color: #5D7A68; margin-top: 30px; line-height: 1.6; font-style: italic; }
          .divider { height: 1px; background-color: rgba(15, 76, 58, 0.08); margin: 40px 0 20px 0; }
          .footer { background-color: #ffffff; padding: 0 40px 40px 40px; text-align: center; font-size: 12px; color: #5D7A68; }
          .footer p { margin: 6px 0; }
          .footer a { color: #C8A96A; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1 class="logo">GEETEJ VIRAASAT</h1>
              <div class="logo-sub">Heritage & Fine Jewelry</div>
            </div>
            <div class="content">
              <h2 class="title">${capitalizedType} Code</h2>
              <p class="description">
                Thank you for choosing Geetej Viraasat. Please use the secure verification code below to complete your registration or login verification process. This code is valid for 5 minutes.
              </p>
              <div class="code-container">
                <div class="code">${code}</div>
              </div>
              <p class="expiry">If you did not request this verification, please ignore this email or contact support if you suspect unauthorized activity.</p>
              <div class="divider"></div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Geetej Viraasat. All rights reserved.</p>
              <p>Support: <a href="mailto:support@geetejviraasat.com">support@geetejviraasat.com</a></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({ to: email, subject, html });
  }

  /**
   * Send order confirmation email to customer.
   */
  async sendOrderConfirmation(email: string, order: any): Promise<boolean> {
    const subject = `Your Geetej Viraasat Order #${order.orderNumber} is Confirmed`;

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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Geetej Viraasat - Order Confirmation</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Montserrat', Arial, sans-serif; background-color: #FAF7F2; margin: 0; padding: 0; color: #0F4C3A; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; background-color: #FAF7F2; padding: 40px 0; }
          .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(15, 76, 58, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 76, 58, 0.04); }
          .header { background-color: #0F4C3A; padding: 40px 20px; text-align: center; border-bottom: 4px solid #C8A96A; }
          .logo { color: #C8A96A; font-family: 'Playfair Display', 'Georgia', serif; font-size: 28px; font-weight: 500; letter-spacing: 6px; text-transform: uppercase; margin: 0; }
          .logo-sub { color: #FAF7F2; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-top: 5px; opacity: 0.8; font-weight: 300; }
          .content { padding: 45px 35px; }
          .thankyou { font-family: 'Playfair Display', 'Georgia', serif; font-size: 24px; font-weight: 600; color: #0F4C3A; text-align: center; margin-bottom: 10px; }
          .subheading { font-size: 14px; color: #5D7A68; text-align: center; margin-bottom: 40px; line-height: 1.6; }
          .order-details-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .order-details-table th { padding: 12px 10px; border-bottom: 2px solid rgba(15, 76, 58, 0.1); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #5D7A68; text-align: left; }
          .totals-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; border-top: 1px solid rgba(15, 76, 58, 0.1); padding-top: 15px; }
          .totals-table td { padding: 10px 12px; font-size: 14px; }
          .totals-label { text-align: right; color: #5D7A68; width: 75%; }
          .totals-val { text-align: right; font-weight: 500; color: #0F4C3A; }
          .grand-total-label { text-align: right; font-family: 'Playfair Display', 'Georgia', serif; font-size: 18px; font-weight: bold; color: #0F4C3A; border-top: 2px solid #C8A96A; padding-top: 15px !important; }
          .grand-total-val { text-align: right; font-size: 18px; font-weight: 700; color: #0F4C3A; border-top: 2px solid #C8A96A; padding-top: 15px !important; }
          .section-title { font-family: 'Playfair Display', 'Georgia', serif; font-size: 16px; font-weight: 600; color: #0F4C3A; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
          .card-block { background-color: #FAF7F2; border: 1px solid rgba(15, 76, 58, 0.05); border-radius: 8px; padding: 20px; font-size: 13px; line-height: 1.7; border-left: 3px solid #C8A96A; }
          .footer { background-color: #ffffff; padding: 0 35px 40px 35px; text-align: center; border-top: 1px solid rgba(15, 76, 58, 0.05); font-size: 12px; color: #5D7A68; padding-top: 30px; }
          .footer a { color: #C8A96A; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1 class="logo">GEETEJ VIRAASAT</h1>
              <div class="logo-sub">Heritage & Fine Jewelry</div>
            </div>
            <div class="content">
              <div class="thankyou">Order Confirmed</div>
              <div class="subheading">Thank you for your purchase from Geetej Viraasat. Your order <strong>#${order.orderNumber}</strong> has been successfully placed. We are preparing it for shipment.</div>

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
              <p>If you have any questions, please contact support. Do not reply directly to this email.</p>
              <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} Geetej Viraasat. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendMail({ to: email, subject, html });
  }

  /**
   * Send contact inquiry notification to admin.
   */
  async sendContactInquiryNotification(inquiry: any): Promise<boolean> {
    const subject = `[Admin Alert] New Inquiry from ${inquiry.name}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Inquiry Submission</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Playfair+Display:wght@500;600&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Montserrat', Arial, sans-serif; background-color: #FAF7F2; padding: 30px; margin: 0; color: #0F4C3A; -webkit-font-smoothing: antialiased; }
          .card { max-width: 600px; margin: 0 auto; background: white; border: 1px solid rgba(15, 76, 58, 0.08); border-radius: 12px; padding: 40px; box-shadow: 0 10px 30px rgba(15, 76, 58, 0.04); }
          .header { font-family: 'Playfair Display', 'Georgia', serif; font-size: 20px; font-weight: 600; border-bottom: 2px solid #C8A96A; padding-bottom: 15px; margin-bottom: 30px; color: #0F4C3A; text-align: center; letter-spacing: 1px; }
          .field { margin-bottom: 20px; }
          .label { font-weight: 600; color: #5D7A68; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
          .value { font-size: 15px; margin-top: 5px; color: #0F4C3A; font-weight: 500; }
          .message-box { background: #FAF7F2; border: 1px solid rgba(15, 76, 58, 0.05); border-left: 3px solid #C8A96A; border-radius: 4px; padding: 15px 20px; white-space: pre-wrap; margin-top: 5px; color: #0F4C3A; font-size: 14px; line-height: 1.6; }
        </style>
      </head>
      <body>
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

    return this.sendMail({ to: adminEmail, subject, html });
  }
}

export const emailService = new EmailService();
