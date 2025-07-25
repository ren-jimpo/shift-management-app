import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

// デフォルトの送信者メールアドレス
const DEFAULT_FROM = 'noreply@futurehrinc.com';

/**
 * メールを送信する基本関数
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = DEFAULT_FROM
}: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html: html || text || '',
      text: text || undefined,
    });

    if (error) {
      console.error('Email sending error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

/**
 * シフト確定通知メールを送信
 */
export async function sendShiftConfirmationEmail(
  userEmail: string,
  userName: string,
  shifts: Array<{
    date: string;
    storeName: string;
    shiftPattern: string;
    startTime: string;
    endTime: string;
  }>
) {
  const shiftsHtml = shifts.map(shift => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">${shift.date}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${shift.storeName}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${shift.shiftPattern}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${shift.startTime} - ${shift.endTime}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>シフト確定のお知らせ</title>
    </head>
    <body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          シフト確定のお知らせ
        </h1>
        
        <p>お疲れ様です、${userName}さん。</p>
        
        <p>以下のシフトが確定いたしましたので、お知らせいたします。</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">日付</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">店舗</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">シフト</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">時間</th>
            </tr>
          </thead>
          <tbody>
            ${shiftsHtml}
          </tbody>
        </table>
        
        <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>このメールは自動送信されています。</p>
          <p>シフト管理システム</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `【シフト確定】${userName}さんのシフトが確定しました`,
    html,
  });
}

/**
 * 希望休申請承認・拒否通知メールを送信
 */
export async function sendTimeOffRequestResponseEmail(
  userEmail: string,
  userName: string,
  requestDate: string,
  status: 'approved' | 'rejected',
  reason?: string
) {
  const statusText = status === 'approved' ? '承認' : '拒否';
  const statusColor = status === 'approved' ? '#10b981' : '#ef4444';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>希望休申請の${statusText}について</title>
    </head>
    <body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: ${statusColor}; border-bottom: 2px solid ${statusColor}; padding-bottom: 10px;">
          希望休申請の${statusText}について
        </h1>
        
        <p>お疲れ様です、${userName}さん。</p>
        
        <p>${requestDate}の希望休申請について、以下の通り${statusText}いたします。</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: ${statusColor};">申請結果: ${statusText}</h3>
          <p style="margin: 0;"><strong>対象日:</strong> ${requestDate}</p>
          ${reason ? `<p style="margin: 10px 0 0 0;"><strong>理由:</strong> ${reason}</p>` : ''}
        </div>
        
        ${status === 'approved' 
          ? '<p>希望休が承認されました。当日は休日をお楽しみください。</p>'
          : '<p>申し訳ございませんが、今回の希望休は承認できませんでした。ご理解のほどよろしくお願いいたします。</p>'
        }
        
        <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>このメールは自動送信されています。</p>
          <p>シフト管理システム</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `【希望休申請${statusText}】${requestDate}の申請について`,
    html,
  });
}

/**
 * 代打募集通知メールを送信
 */
export async function sendEmergencyShiftRequestEmail(
  userEmails: string[],
  details: {
    storeName: string;
    date: string;
    shiftPattern: string;
    startTime: string;
    endTime: string;
    reason: string;
  }
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>代打募集のお知らせ</title>
    </head>
    <body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">
          代打募集のお知らせ
        </h1>
        
        <p>お疲れ様です。</p>
        
        <p>以下のシフトで代打を募集しております。ご都合がつく方はご連絡をお願いいたします。</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="margin: 0 0 15px 0; color: #ef4444;">代打募集詳細</h3>
          <p style="margin: 5px 0;"><strong>店舗:</strong> ${details.storeName}</p>
          <p style="margin: 5px 0;"><strong>日付:</strong> ${details.date}</p>
          <p style="margin: 5px 0;"><strong>シフト:</strong> ${details.shiftPattern}</p>
          <p style="margin: 5px 0;"><strong>時間:</strong> ${details.startTime} - ${details.endTime}</p>
          <p style="margin: 5px 0;"><strong>理由:</strong> ${details.reason}</p>
        </div>
        
        <p>代打が可能な方は、シフト管理システムからご応募いただくか、直接ご連絡をお願いいたします。</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/emergency" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            代打に応募する
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>このメールは自動送信されています。</p>
          <p>シフト管理システム</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmails,
    subject: `【代打募集】${details.date} ${details.storeName} ${details.shiftPattern}の代打募集`,
    html,
  });
}

/**
 * 今日のシフト通知メールを送信（毎日0:00自動送信用）
 */
export async function sendTodayShiftNotificationEmail(
  userEmail: string,
  userName: string,
  todayShifts: Array<{
    date: string;
    storeName: string;
    shiftPattern: string;
    startTime: string;
    endTime: string;
  }>
) {
  if (todayShifts.length === 0) {
    // 今日シフトがない場合はメールを送信しない
    return { success: true, message: 'No shifts today' };
  }

  const shiftsHtml = todayShifts.map(shift => `
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #3b82f6;">
      <h3 style="margin: 0 0 10px 0; color: #1e40af;">${shift.storeName}</h3>
      <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">${shift.shiftPattern}</p>
      <p style="margin: 5px 0; color: #374151;"><strong>時間:</strong> ${shift.startTime} - ${shift.endTime}</p>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>今日のシフトのお知らせ</title>
    </head>
    <body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          🌅 今日のシフトのお知らせ
        </h1>
        
        <p>おはようございます、${userName}さん。</p>
        
        <p>本日（${todayShifts[0].date}）のシフトをお知らせいたします。</p>
        
        ${shiftsHtml}
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #374151;">
            <strong>⏰ 出勤時間の確認をお願いします</strong><br>
            遅刻や欠勤の場合は、早めにご連絡をお願いいたします。
          </p>
        </div>
        
        <p>今日も一日よろしくお願いいたします！</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>このメールは自動送信されています。</p>
          <p>シフト管理システム</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: `【今日のシフト】${userName}さん、お疲れ様です！`,
    html,
  });
}

/**
 * バッチ処理で複数ユーザーに今日のシフト通知を送信
 */
export async function sendBatchTodayShiftNotifications(
  notifications: Array<{
    userEmail: string;
    userName: string;
    todayShifts: Array<{
      date: string;
      storeName: string;
      shiftPattern: string;
      startTime: string;
      endTime: string;
    }>;
  }>
) {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[]
  };

  // バッチ処理で並列実行（制限付き）
  const batchSize = 5; // 同時送信数を制限
  
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (notification) => {
      try {
        if (notification.todayShifts.length === 0) {
          results.skipped++;
          return { success: true, email: notification.userEmail, message: 'No shifts today' };
        }

        await sendTodayShiftNotificationEmail(
          notification.userEmail,
          notification.userName,
          notification.todayShifts
        );
        
        results.success++;
        return { success: true, email: notification.userEmail };
      } catch (error) {
        results.failed++;
        const errorMessage = `Failed to send to ${notification.userEmail}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMessage);
        return { success: false, email: notification.userEmail, error: errorMessage };
      }
    });

    // バッチを並列実行
    await Promise.all(batchPromises);
    
    // 次のバッチまで少し待機（レート制限対策）
    if (i + batchSize < notifications.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    }
  }

  console.log(`Batch email sending completed: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped`);
  
  return results;
}

/**
 * 一般的な通知メールを送信
 */
export async function sendNotificationEmail(
  userEmail: string,
  userName: string,
  title: string,
  message: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
    </head>
    <body style="font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
          ${title}
        </h1>
        
        <p>お疲れ様です、${userName}さん。</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${message.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
          <p>このメールは自動送信されています。</p>
          <p>シフト管理システム</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: userEmail,
    subject: title,
    html,
  });
} 