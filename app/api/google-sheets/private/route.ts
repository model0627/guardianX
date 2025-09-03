import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { query } from '@/lib/database';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

/**
 * @swagger
 * /api/google-sheets/private:
 *   post:
 *     summary: Fetch data from private Google Sheets
 *     description: Fetch data from a private Google Sheets using OAuth authentication
 *     tags:
 *       - Google Sheets
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - spreadsheetId
 *             properties:
 *               spreadsheetId:
 *                 type: string
 *                 description: Google Sheets spreadsheet ID
 *               sheetName:
 *                 type: string
 *                 default: Sheet1
 *                 description: Name of the sheet tab
 *               range:
 *                 type: string
 *                 default: A:Z
 *                 description: Range notation (e.g., A1:Z100, A:Z)
 *     responses:
 *       200:
 *         description: Data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 spreadsheetInfo:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     sheetCount:
 *                       type: number
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized or Google account not connected
 *       403:
 *         description: Insufficient permissions for the spreadsheet
 *       404:
 *         description: Spreadsheet not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // 사용자 인증 확인
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheetId, sheetName = '', range = 'A:Z' } = await request.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'Spreadsheet ID is required' },
        { status: 400 }
      );
    }

    // 사용자의 Google 계정 정보 가져오기
    const googleAccountResult = await query(
      `SELECT access_token, refresh_token, token_expires_at
       FROM google_accounts 
       WHERE user_id = $1`,
      [user.userId]
    );

    if (googleAccountResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Google 계정이 연결되지 않았습니다. 먼저 Google 계정을 연결해주세요.' },
        { status: 401 }
      );
    }

    const googleAccount = googleAccountResult.rows[0];

    // OAuth 클라이언트 설정
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/google/callback`
    );

    // 토큰 설정
    oauth2Client.setCredentials({
      access_token: googleAccount.access_token,
      refresh_token: googleAccount.refresh_token,
      expiry_date: googleAccount.token_expires_at ? new Date(googleAccount.token_expires_at).getTime() : undefined
    });

    // 토큰 갱신 처리
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        // 새 토큰으로 데이터베이스 업데이트
        await query(
          `UPDATE google_accounts 
           SET access_token = $1, 
               refresh_token = COALESCE($2, refresh_token),
               token_expires_at = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $4`,
          [
            tokens.access_token,
            tokens.refresh_token,
            tokens.expiry_date ? new Date(tokens.expiry_date) : null,
            user.userId
          ]
        );
      }
    });

    try {
      // 토큰이 만료되었는지 확인하고 갱신 시도
      const now = new Date();
      const expiryDate = googleAccount.token_expires_at ? new Date(googleAccount.token_expires_at) : null;
      
      if (expiryDate && now >= expiryDate) {
        console.log('[GoogleSheets] Token expired, attempting to refresh...');
        try {
          await oauth2Client.refreshAccessToken();
        } catch (refreshError) {
          console.error('[GoogleSheets] Token refresh failed:', refreshError);
          return NextResponse.json(
            { 
              error: 'Google 인증이 만료되었습니다. 다시 로그인해주세요.',
              code: 'GOOGLE_AUTH_EXPIRED',
              requireReauth: true
            },
            { status: 401 }
          );
        }
      }

      // Google Sheets API 클라이언트 생성
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      // 스프레드시트 정보 가져오기
      const spreadsheetResponse = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      });

      const spreadsheetInfo = {
        title: spreadsheetResponse.data.properties?.title || 'Unknown',
        sheetCount: spreadsheetResponse.data.sheets?.length || 0,
        sheets: spreadsheetResponse.data.sheets?.map(sheet => ({
          title: sheet.properties?.title,
          sheetId: sheet.properties?.sheetId
        })) || []
      };

      // 시트 목록에서 첫 번째 시트 이름 가져오기
      const availableSheets = spreadsheetResponse.data.sheets || [];
      let targetSheetName = sheetName;
      
      // 시트 이름이 비어있거나 존재하지 않으면 첫 번째 시트 사용
      if (!sheetName || sheetName.trim() === '') {
        targetSheetName = availableSheets[0]?.properties?.title || 'Sheet1';
        console.log(`No sheet name provided, using first sheet: "${targetSheetName}"`);
      } else {
        const sheetExists = availableSheets.some(sheet => 
          sheet.properties?.title === sheetName
        );
        
        if (!sheetExists && availableSheets.length > 0) {
          targetSheetName = availableSheets[0].properties?.title || 'Sheet1';
          console.log(`Requested sheet "${sheetName}" not found, using "${targetSheetName}"`);
        }
      }

      // 데이터 가져오기
      const rangeNotation = targetSheetName ? `'${targetSheetName}'!${range}` : range;
      console.log(`Fetching data with range: ${rangeNotation}`);
      
      const valuesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: rangeNotation,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });

      const rows = valuesResponse.data.values || [];
      
      if (rows.length === 0) {
        return NextResponse.json({
          success: true,
          data: [],
          spreadsheetInfo,
          message: '스프레드시트에 데이터가 없습니다.'
        });
      }

      // 첫 번째 행을 헤더로 사용
      const headers = rows[0];
      const dataRows = rows.slice(1);

      // 객체 배열로 변환
      const data = dataRows.map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
          if (header && typeof header === 'string') {
            obj[header.trim()] = row[index] !== undefined ? row[index] : '';
          }
        });
        return obj;
      });

      return NextResponse.json({
        success: true,
        data,
        spreadsheetInfo: {
          ...spreadsheetInfo,
          usedSheetName: targetSheetName
        },
        message: `"${targetSheetName}" 시트에서 ${data.length}개의 레코드를 성공적으로 가져왔습니다.`
      });

    } catch (sheetsError: any) {
      console.error('Google Sheets API error:', sheetsError);
      
      // invalid_grant 오류 처리
      if (sheetsError.message?.includes('invalid_grant') || sheetsError.error === 'invalid_grant') {
        console.log('[GoogleSheets] Invalid grant error, attempting token refresh...');
        try {
          await oauth2Client.refreshAccessToken();
          console.log('[GoogleSheets] Token refreshed successfully, retrying API call...');
          
          // 토큰 갱신 후 재시도
          const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
          const spreadsheetResponse = await sheets.spreadsheets.get({
            spreadsheetId,
            includeGridData: false
          });

          const spreadsheetInfo = {
            title: spreadsheetResponse.data.properties?.title || 'Unknown',
            sheetCount: spreadsheetResponse.data.sheets?.length || 0,
            sheets: spreadsheetResponse.data.sheets?.map(sheet => ({
              title: sheet.properties?.title,
              sheetId: sheet.properties?.sheetId
            })) || []
          };

          const targetSheetName = sheetName || (spreadsheetInfo.sheets[0]?.title as string) || 'Sheet1';
          const rangeNotation = `${targetSheetName}!${range}`;

          const valuesResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: rangeNotation,
            valueRenderOption: 'UNFORMATTED_VALUE',
            dateTimeRenderOption: 'FORMATTED_STRING'
          });

          const rows = valuesResponse.data.values || [];
          const headers = rows[0];
          const dataRows = rows.slice(1);

          const data = dataRows.map(row => {
            const obj: Record<string, any> = {};
            headers.forEach((header, index) => {
              if (header && typeof header === 'string') {
                obj[header.trim()] = row[index] !== undefined ? row[index] : '';
              }
            });
            return obj;
          });

          return NextResponse.json({
            success: true,
            data,
            spreadsheetInfo: {
              ...spreadsheetInfo,
              usedSheetName: targetSheetName
            },
            message: `"${targetSheetName}" 시트에서 ${data.length}개의 레코드를 성공적으로 가져왔습니다.`
          });

        } catch (retryError) {
          console.error('[GoogleSheets] Retry after token refresh failed:', retryError);
          
          // 토큰이 완전히 무효한 경우 Google 계정 연결 삭제
          await query(
            'DELETE FROM google_accounts WHERE user_id = $1',
            [user.userId]
          );
          
          return NextResponse.json(
            { 
              error: 'Google 인증이 완전히 만료되었습니다. Google 계정을 다시 연결해주세요.',
              requireReauth: true
            },
            { status: 401 }
          );
        }
      }
      
      if (sheetsError.code === 403) {
        return NextResponse.json(
          { 
            error: '스프레드시트에 접근할 권한이 없습니다. 스프레드시트가 공유되어 있는지 확인해주세요.',
            details: 'Google 계정에 스프레드시트 접근 권한이 필요합니다.'
          },
          { status: 403 }
        );
      } else if (sheetsError.code === 404) {
        return NextResponse.json(
          { 
            error: '스프레드시트를 찾을 수 없습니다.',
            details: '스프레드시트 ID가 올바른지 확인해주세요.'
          },
          { status: 404 }
        );
      } else if (sheetsError.code === 401) {
        return NextResponse.json(
          { 
            error: 'Google 인증이 만료되었습니다. 다시 로그인해주세요.',
            details: 'Google 계정을 다시 연결해주세요.'
          },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          { 
            error: '스프레드시트 데이터를 가져오는 중 오류가 발생했습니다.',
            details: sheetsError.message || 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('Private Google Sheets fetch error:', error);
    return NextResponse.json(
      { 
        error: '요청 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}