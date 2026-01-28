const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const EmailSend = async (to, sub, msg) => {
  try {
    await resend.emails.send({
      from: 'AY Social <onboarding@resend.dev>', // Default for testing
      to: to,
      subject: sub,
      html: msg,
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

module.exports = EmailSend;

