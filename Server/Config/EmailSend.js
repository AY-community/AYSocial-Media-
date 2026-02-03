const brevo = require('@getbrevo/brevo');

let apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const EmailSend = async (to, sub, msg) => {
  try {
    console.log('=== BREVO EMAIL SEND ===');
    console.log('To:', to);
    console.log('Subject:', sub);
    
    let sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = sub;
    sendSmtpEmail.htmlContent = msg;
    sendSmtpEmail.sender = { 
      name: "AY Social", 
      email: "aymenchedri@gmail.com" 
    };
    sendSmtpEmail.to = [{ email: to }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully - Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('=== BREVO EMAIL ERROR ===');
    console.error('Error:', error.message);
    console.error('Full error:', error);
    throw error;
  }
};

module.exports = EmailSend;