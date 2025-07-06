# OTP Email Verification Setup Guide

## Environment Variables Required

Add these environment variables to your backend `.env` file:

```env
# Email Configuration (for Gmail)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# Client URL (for OTP verification)
CLIENT_URL=http://localhost:5173
```

## Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in your `EMAIL_PASS` environment variable

## How OTP Verification Works

1. **Signup Flow**:
   - User fills out signup form
   - System generates 6-digit OTP
   - User is saved as "unverified" in database
   - OTP email is sent to user's email
   - User is redirected to OTP verification page

2. **OTP Verification**:
   - User enters 6-digit OTP on verification page
   - System validates OTP and marks user as verified
   - User is redirected to login page

3. **Login Protection**:
   - Unverified users cannot log in
   - They receive message to verify email first

4. **Resend OTP**:
   - If OTP expires (10 minutes), users can request new one
   - Timer shows countdown for resend functionality

## Features Implemented

✅ Generate 6-digit OTP  
✅ Save user as "unverified"  
✅ Send OTP email  
✅ OTP verification endpoint  
✅ Login protection for unverified users  
✅ Resend OTP functionality  
✅ Frontend OTP verification page  
✅ OTP expiration (10 minutes)  
✅ Auto-focus OTP input fields  
✅ Countdown timer for resend  

## Testing

1. Create a new account
2. Check your email for 6-digit OTP
3. Enter OTP on verification page
4. Try logging in (should work after verification)
5. Test with expired/invalid OTP
6. Test resend OTP functionality
7. Test auto-focus and navigation between OTP fields 