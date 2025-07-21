import { NextRequest, NextResponse } from 'next/server';
import { 
  sendEmail,
  sendShiftConfirmationEmail,
  sendTimeOffRequestResponseEmail,
  sendEmergencyShiftRequestEmail,
  sendNotificationEmail,
  sendTodayShiftNotificationEmail
} from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...emailData } = body;

    switch (type) {
      case 'basic':
        const { to, subject, html, text, from } = emailData;
        await sendEmail({ to, subject, html, text, from });
        break;

      case 'shift-confirmation':
        const { userEmail: shiftEmail, userName: shiftUser, shifts } = emailData;
        await sendShiftConfirmationEmail(shiftEmail, shiftUser, shifts);
        break;

      case 'time-off-response':
        const { 
          userEmail: timeOffEmail, 
          userName: timeOffUser, 
          requestDate, 
          status, 
          reason 
        } = emailData;
        await sendTimeOffRequestResponseEmail(
          timeOffEmail, 
          timeOffUser, 
          requestDate, 
          status, 
          reason
        );
        break;

      case 'emergency-request':
        const { userEmails, details } = emailData;
        await sendEmergencyShiftRequestEmail(userEmails, details);
        break;

      case 'notification':
        const { 
          userEmail: notificationEmail, 
          userName: notificationUser, 
          title, 
          message 
        } = emailData;
        await sendNotificationEmail(
          notificationEmail, 
          notificationUser, 
          title, 
          message
        );
        break;

      case 'today-shift-notification':
        const { 
          userEmail: todayEmail, 
          userName: todayUser, 
          todayShifts 
        } = emailData;
        await sendTodayShiftNotificationEmail(
          todayEmail, 
          todayUser, 
          todayShifts
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 