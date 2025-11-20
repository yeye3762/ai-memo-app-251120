import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { supabaseAdmin } from '@/lib/supabase/serverClient'
import { revalidatePath } from 'next/cache'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set')
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null

// 데이터베이스 스키마와 Memo 인터페이스 간 변환
const mapDbRowToMemo = (row: any) => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  tags: row.tags || [],
  summary: row.summary || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function POST(request: NextRequest) {
  try {
    if (!ai) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      )
    }

    const { id, content, title } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Memo ID is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // AI 요약 생성
    const prompt = `다음 메모를 간결하고 명확하게 요약해주세요. 핵심 내용과 주요 포인트를 포함해주세요.

제목: ${title || '(제목 없음)'}

내용:
${content}

요약:`

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    })

    const summary = response.text

    // 데이터베이스에 요약 저장
    const { data, error } = await supabaseAdmin
      .from('memos')
      .update({ summary })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating summary in database:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 })
    }

    revalidatePath('/')
    return NextResponse.json({
      summary,
      memo: mapDbRowToMemo(data),
    })
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

