export function GetEmailTemplate({ username, message, otp = null, link = null , topic = "Click here" }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email from AY</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <h2 style="color: #333;">Hello ${username},</h2>
          <p style="font-size: 16px; color: #555;">${message}</p>

          ${
            otp
              ? `<div style="margin: 25px 0; text-align: center;">
                    <span style="display: inline-block; font-size: 28px; font-weight: bold; color: #8A2BE2; background-color: #f0f0f0; padding: 10px 25px; border-radius: 6px;">${otp}</span>
                </div>`
              : ""
          }

          ${
            link
              ? `<p style="margin-top: 20px;">
                  <a href="${link}" style="display:inline-block; background-color:#8A2BE2; color:#fff; text-decoration:none; padding:10px 20px; border-radius:4px;">
                    ${topic}
                  </a>
                 </p>`
              : ""
          }

          <p style="font-size: 14px; color: #999; margin-top: 40px;">If you did not request this, you can safely ignore this email.</p>
          <p style="font-size: 14px; color: #333; margin-top: 20px;">– AY Community </p>
        </div>
      </body>
    </html>
  `;
}
