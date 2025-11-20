import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set')
}

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null

export async function POST(request: NextRequest) {
  try {
    if (!ai) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured' },
        { status: 500 }
      )
    }

    const { title, content } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // AI 태그 생성
    const prompt = `다음 메모의 내용을 분석하여 관련된 태그를 추천해주세요. 태그는 3-5개 정도로 간결하고 핵심적인 키워드로 작성해주세요. 각 태그는 쉼표로 구분하고, 태그만 반환해주세요.

제목: ${title || '(제목 없음)'}

내용:
${content}

태그:`

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-001',
      contents: prompt,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    })

    if (!response.text) {
      return NextResponse.json(
        { error: 'Failed to generate tags: No response from AI' },
        { status: 500 }
      )
    }

    const tagsText = response.text.trim()
    
    // 쉼표로 구분된 태그를 배열로 변환
    const tags = tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 5) // 최대 5개로 제한

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('Error generating tags:', error)
    return NextResponse.json(
      { error: 'Failed to generate tags' },
      { status: 500 }
    )
  }
}

