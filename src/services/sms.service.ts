import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = async (to: string, message: string): Promise<boolean> => {
  try {
    // Format Sri Lanka number properly
    let formatted = to.replace(/\s+/g, '');
    if (formatted.startsWith('0')) {
      formatted = '+94' + formatted.substring(1);
    }
    if (!formatted.startsWith('+')) {
      formatted = '+94' + formatted;
    }

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatted
    });

    return true;
  } catch (error) {
    console.error('SMS send error:', error);
    return false;
  }
};