import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

/**
 * @swagger
 * /api/google-sheets/fetch:
 *   post:
 *     summary: Google Sheets 데이터 가져오기
 *     description: 공개된 Google Sheets 스프레드시트에서 데이터를 가져옵니다. 스프레드시트는 "링크가 있는 모든 사용자"에게 공유되어 있어야 합니다.
 *     tags: [Google Sheets]
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - spreadsheetUrl
 *             properties:
 *               spreadsheetUrl:
 *                 type: string
 *                 description: Google Sheets URL
 *                 example: https://docs.google.com/spreadsheets/d/1ABC123/edit
 *               sheetName:
 *                 type: string
 *                 description: 시트 이름
 *                 default: Sheet1
 *               range:
 *                 type: string
 *                 description: 데이터 범위
 *                 default: A:Z
 *     responses:
 *       200:
 *         description: 데이터 가져오기 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                   description: 스프레드시트 데이터
 *                 spreadsheetId:
 *                   type: string
 *                   description: 스프레드시트 ID
 *                 method:
 *                   type: string
 *                   enum: [csv, api]
 *                   description: 데이터 가져오기 방법
 *       400:
 *         description: 잘못된 요청 (URL 누락 또는 형식 오류)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 스프레드시트 접근 권한 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { spreadsheetUrl, sheetName = 'Sheet1', range = 'A:Z' } = await request.json();

    if (!spreadsheetUrl) {
      return NextResponse.json(
        { error: '스프레드시트 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // Google Sheets URL에서 스프레드시트 ID 추출
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: '올바른 Google Sheets URL이 아닙니다.' },
        { status: 400 }
      );
    }

    // Google Sheets를 CSV로 내보내기 (공개 스프레드시트의 경우)
    // 이 방법은 "링크가 있는 모든 사용자" 공유 설정이 되어 있는 경우 작동
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
    
    try {
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        // CSV 내보내기가 실패하면 Google Sheets API v4 사용 시도
        const apiKey = process.env.GOOGLE_API_KEY;
        if (apiKey) {
          const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!${range}?key=${apiKey}`;
          const apiResponse = await fetch(apiUrl);
          
          if (apiResponse.ok) {
            const data = await apiResponse.json();
            const formattedData = formatSheetsData(data.values);
            
            return NextResponse.json({
              success: true,
              data: formattedData,
              spreadsheetId,
              method: 'api'
            });
          }
        }
        
        return NextResponse.json(
          { 
            error: '스프레드시트에 접근할 수 없습니다. 공유 설정을 확인해주세요.',
            details: '스프레드시트가 "링크가 있는 모든 사용자"에게 공유되어 있는지 확인하세요.'
          },
          { status: 403 }
        );
      }

      const csvText = await response.text();
      const data = parseCSV(csvText);
      
      return NextResponse.json({
        success: true,
        data,
        spreadsheetId,
        method: 'csv'
      });

    } catch (fetchError) {
      console.error('Spreadsheet fetch error:', fetchError);
      return NextResponse.json(
        { 
          error: '스프레드시트 데이터를 가져오는데 실패했습니다.',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Google Sheets fetch error:', error);
    return NextResponse.json(
      { error: 'Google Sheets 데이터 가져오기 실패' },
      { status: 500 }
    );
  }
}

/**
 * Google Sheets URL에서 스프레드시트 ID 추출
 */
function extractSpreadsheetId(url: string): string | null {
  // https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * CSV 텍스트를 JSON 배열로 파싱
 */
function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // 첫 번째 줄을 헤더로 사용
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }
  
  return data;
}

/**
 * CSV 라인 파싱 (따옴표 처리 포함)
 */
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Google Sheets API 데이터 포맷팅
 */
function formatSheetsData(values: any[][]): any[] {
  if (!values || values.length === 0) return [];
  
  const headers = values[0];
  const data = [];
  
  for (let i = 1; i < values.length; i++) {
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[i][index] || '';
    });
    data.push(row);
  }
  
  return data;
}