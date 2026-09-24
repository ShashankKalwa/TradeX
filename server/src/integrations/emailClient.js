const nodemailer = require('nodemailer');
const { email: emailConfig } = require('../config/env');
const logger = require('../config/logger');

/**
 * Transactional email. Optional by design: without SMTP credentials the message
 * is logged instead of sent, so alerting works in a local demo without an
 * account, and never blocks the job that triggered it.
 */
let transport = null;

const isConfigured = () => Boolean(emailConfig.host && emailConfig.user && emailConfig.pass);

const getTransport = () => {
  if (!isConfigured()) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.port === 465,
      auth: { user: emailConfig.user, pass: emailConfig.pass }
    });
  }
  return transport;
};

const send = async ({ to, subject, text, html }) => {
  const mailer = getTransport();

  if (!mailer) {
    logger.info(`[email:not-configured] to=${to} subject="${subject}"`);
    return { sent: false, reason: 'not_configured' };
  }

  try {
    await mailer.sendMail({ from: emailConfig.from, to, subject, text, html });
    return { sent: true };
  } catch (err) {
    logger.error(`Email delivery failed to ${to}: ${err.message}`);
    return { sent: false, reason: err.message };
  }
};

const sendPriceAlert = ({ to, symbol, targetPrice, direction, price }) =>
  send({
    to,
    subject: `TradeX alert — ${symbol} is ${direction} ${targetPrice}`,
    text: `${symbol} is trading at ${price}, which is ${direction} your target of ${targetPrice}.`,
    html: `<p><strong>${symbol}</strong> is trading at <strong>${price}</strong>, which is ${direction} your target of <strong>${targetPrice}</strong>.</p>`
  });

const sendVerificationEmail = ({ to, name, verifyUrl }) =>
  send({
    to,
    subject: 'Verify your TradeX account',
    text: `Hi ${name},\n\nThanks for joining TradeX. To activate your virtual trading desk, please confirm your email address: ${verifyUrl}\n\n- The TradeX Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #14120e; padding: 40px 20px;">
        <div style="max-width: 540px; margin: 0 auto; background-color: #f4eee1; border-radius: 3px; overflow: hidden; border: 1px solid #c9bda2; box-shadow: 0 4px 12px rgba(20,18,14,0.6);">
          
          <div style="padding: 24px; background-color: #191713; text-align: center; border-bottom: 2px solid #a99a78;">
            <h1 style="margin: 0; color: #f4eee1; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">TradeX</h1>
          </div>
          
          <div style="padding: 32px 32px;">
            <h2 style="margin-top: 0; font-size: 20px; color: #241f1a; font-weight: 700;">Welcome to your virtual desk</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #5c5344;">Hi ${name},</p>
            <p style="font-size: 16px; line-height: 1.6; color: #5c5344;">Thanks for joining TradeX. To activate your account and start building your simulated portfolio, please confirm your email address by clicking the secure ticket below.</p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verifyUrl}" style="background-color: #1e5c46; color: #f4eee1; padding: 14px 28px; text-decoration: none; border-radius: 3px; font-weight: 700; font-size: 16px; display: inline-block; border: 1px solid #0a7d54; box-shadow: 0 2px 4px rgba(30,24,14,0.2);">STAMP VERIFICATION</a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.5; color: #6f6552;">If the ticket doesn't work, you can copy and paste this link into your browser:<br/><a href="${verifyUrl}" style="color: #2b5b84; text-decoration: none; word-break: break-all; font-weight: 500;">${verifyUrl}</a></p>
          </div>
          
          <div style="padding: 20px 32px; background-color: #ece4d4; text-align: center; border-top: 1px solid #c9bda2;">
            <p style="margin: 0; font-size: 12px; color: #6f6552;">&copy; ${new Date().getFullYear()} TradeX Virtual Trading Platform.<br/>This is an automated message, please do not reply.</p>
          </div>
          
        </div>
      </div>
    `
  });

module.exports = { send, sendPriceAlert, sendVerificationEmail, isConfigured };
