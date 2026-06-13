export interface ApplicationData {
  firstName: string
  lastName: string
  email: string
  phone: string
  nationality: string
  destination: string
  travelStartDate: string
  travelEndDate: string
  maritalStatus?: string
  spouseAccompanying?: string
  hasDocuments?: boolean
}

// Admin notification when new lead is submitted
export const getAdminNotificationEmail = (data: ApplicationData) => {
  const hasDocuments = data.hasDocuments ? "Yes" : "No"
  
  const textContent = `
NEW VISA APPLICATION

Name: ${data.firstName} ${data.lastName}
Email: ${data.email}
Phone: ${data.phone}
Nationality: ${data.nationality}
Destination: ${data.destination}
Travel Period: ${data.travelStartDate} to ${data.travelEndDate}${data.maritalStatus ? `\nMarital Status: ${data.maritalStatus}` : ''}${data.spouseAccompanying ? `\nSpouse Traveling: ${data.spouseAccompanying}` : ''}
Documents Uploaded: ${hasDocuments}

Check HubSpot CRM for complete details and attachments.
  `.trim()
  
  return {
    subject: `New Visa Application - ${data.firstName} ${data.lastName}`,
    html: `<pre style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333;">${textContent}</pre>`,
  }
}

// Client confirmation email after submission
export const getClientConfirmationEmail = (data: ApplicationData) => {
  return {
    subject: `Application Received - ${data.destination} Visa`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .next-steps { background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .next-steps h3 { color: #047857; margin-top: 0; }
            .next-steps ul { margin: 10px 0; padding-left: 20px; }
            .next-steps li { margin: 8px 0; color: #065f46; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">✅ Application Received!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for choosing EZVisa.net</p>
            </div>
            <div class="content">
              <div class="section">
                <h2>Dear ${data.firstName},</h2>
                <p>We have successfully received your visa application for <strong>${data.destination}</strong>.</p>
                <p>Your application details:</p>
                <ul>
                  <li><strong>Destination:</strong> ${data.destination}</li>
                  <li><strong>Travel Period:</strong> ${data.travelStartDate} to ${data.travelEndDate}</li>
                  <li><strong>Application ID:</strong> <span class="highlight">${Date.now()}</span></li>
                </ul>
              </div>
              
              <div class="next-steps">
                <h3>🎯 What Happens Next?</h3>
                <ul>
                  <li>Complete your payment to start processing</li>
                  <li>Our visa experts will review your application within 24 hours</li>
                  <li>We'll prepare all required documents (flight, hotel, itinerary, cover letter)</li>
                  <li>You'll receive updates at every step</li>
                  <li>24/7 support until your visa is approved</li>
                </ul>
              </div>
              
              ${!data.hasDocuments ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #b45309; margin-top: 0;">📄 Document Upload Reminder</h3>
                <p style="color: #92400e; margin: 0;">After payment, we'll send you instructions to upload your documents (passport copy, photos, etc.)</p>
              </div>
              ` : ''}
              
              <div class="section" style="text-align: center;">
                <p style="color: #6b7280;">Questions? Reply to this email or contact us at <strong>support@ezvisa.net</strong></p>
              </div>
            </div>
            <div class="footer">
              <p>EZVisa.net - Your Trusted Visa Partner</p>
              <p>© ${new Date().getFullYear()} EZVisa.net. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }
}

// Payment success email to client
export const getPaymentSuccessEmail = (data: ApplicationData, paymentAmount: number, currency: string) => {
  return {
    subject: `Payment Confirmed - ${data.destination} Visa Application`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .success-badge { background: #d1fae5; color: #065f46; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }
            .next-steps { background: #ede9fe; border-left: 4px solid #7c3aed; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .next-steps h3 { color: #5b21b6; margin-top: 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🎉 Payment Successful!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your visa application is now being processed</p>
            </div>
            <div class="content">
              <div class="section" style="text-align: center;">
                <div class="success-badge">✓ Payment Confirmed</div>
                <h2>Dear ${data.firstName},</h2>
                <p>Thank you for your payment of <strong>${currency}${paymentAmount}</strong></p>
                <p>Your ${data.destination} visa application is now in progress!</p>
              </div>
              
              <div class="section">
                <h3>📋 Application Summary</h3>
                <p><strong>Destination:</strong> ${data.destination}</p>
                <p><strong>Travel Dates:</strong> ${data.travelStartDate} to ${data.travelEndDate}</p>
                <p><strong>Payment Amount:</strong> ${currency}${paymentAmount}</p>
                <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              
              <div class="next-steps">
                <h3>📝 Next Steps</h3>
                <ul>
                  <li>Our visa team will review your application within 24 hours</li>
                  <li>We'll prepare your flight booking, hotel reservation, and travel itinerary</li>
                  <li>You'll receive a personalized cover letter for your visa application</li>
                  <li>All documents will be sent to you via email</li>
                  <li>Our support team is available 24/7 to assist you</li>
                </ul>
              </div>
              
              ${!data.hasDocuments ? `
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #b45309; margin-top: 0;">📄 Upload Your Documents</h3>
                <p style="color: #92400e; margin-bottom: 10px;">Please upload the following documents at your earliest convenience:</p>
                <ul style="color: #92400e;">
                  <li>Passport copy (bio page)</li>
                  <li>Recent passport-sized photo</li>
                  <li>Proof of residence</li>
                  <li>Bank statements (if applicable)</li>
                </ul>
                <p style="margin: 15px 0 0 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://ezvisa.net'}/upload" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Upload Documents</a></p>
              </div>
              ` : ''}
              
              <div class="section" style="text-align: center; background: #f0fdf4;">
                <p style="color: #065f46; font-weight: bold;">Need Help?</p>
                <p style="color: #047857; margin: 10px 0;">Contact us anytime at <strong>support@ezvisa.net</strong></p>
                <p style="color: #047857;">or reply directly to this email</p>
              </div>
            </div>
            <div class="footer">
              <p>EZVisa.net - Your Trusted Visa Partner</p>
              <p>© ${new Date().getFullYear()} EZVisa.net. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }
}

// Payment retry email to client
export const getPaymentRetryEmail = (data: ApplicationData, paymentLink: string) => {
  return {
    subject: `Complete Your Payment - ${data.destination} Visa Application`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 20px 0; }
            .cta-button:hover { background: #059669; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">⏳ Complete Your Payment</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your visa application is waiting</p>
            </div>
            <div class="content">
              <div class="section">
                <h2>Dear ${data.firstName},</h2>
                <p>We noticed that your payment for the <strong>${data.destination}</strong> visa application was not completed.</p>
                <p>Don't worry! Your application details are saved and ready to go. Complete your payment now to start processing:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${paymentLink}" class="cta-button">Complete Payment Now</a>
                </div>
              </div>
              
              <div class="section">
                <h3>📋 Your Application Details</h3>
                <p><strong>Destination:</strong> ${data.destination}</p>
                <p><strong>Travel Dates:</strong> ${data.travelStartDate} to ${data.travelEndDate}</p>
              </div>
              
              <div style="background: #e0e7ff; border-left: 4px solid #6366f1; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #4338ca; margin-top: 0;">✨ What You'll Get</h3>
                <ul style="color: #3730a3;">
                  <li>Complete visa application form</li>
                  <li>Flight and hotel reservations</li>
                  <li>Detailed travel itinerary</li>
                  <li>Personalized cover letter</li>
                  <li>Document review and verification</li>
                  <li>24/7 support until visa approval</li>
                </ul>
              </div>
              
              <div class="section" style="text-align: center;">
                <p style="color: #6b7280;">Questions about your payment?</p>
                <p style="color: #6b7280;">Contact us at <strong>support@ezvisa.net</strong></p>
              </div>
            </div>
            <div class="footer">
              <p>EZVisa.net - Your Trusted Visa Partner</p>
              <p>© ${new Date().getFullYear()} EZVisa.net. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }
}
