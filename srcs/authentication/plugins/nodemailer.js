'use strict'

const fp = require('fastify-plugin')
const nodemailer = require('nodemailer');

module.exports = fp(async function nodemailerPlugin(fastify, opts) {
  fastify.decorate('sendEmail', sendEmail);

  async function sendEmail(recipientEmail, code) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MFA_EMAILER,
        pass: process.env.GOOGLE_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.MFA_EMAILER, 
      to: recipientEmail,
      subject: "Your Transcendence MFA Code",
      text: `Your code is: ${code}` 
    };

    try {
      let info = await transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response); //! DELETE
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}, {
  name: 'nodemailer-plugin'
})
