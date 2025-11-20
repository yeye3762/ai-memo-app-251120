import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/serverClient'
import { revalidatePath } from 'next/cache'

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

const mapMemoToDbRow = (memo: any) => ({
  title: memo.title,
  content: memo.content,
  category: memo.category,
  tags: memo.tags || [],
  summary: memo.summary || undefined,
})

// GET: 모든 메모 가져오기
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching memos:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const memos = (data || []).map(mapDbRowToMemo)
    return NextResponse.json(memos)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 새 메모 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, category, tags } = body

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: 'Title, content, and category are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('memos')
      .insert([
        {
          title,
          content,
          category,
          tags: tags || [],
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating memo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    return NextResponse.json(mapDbRowToMemo(data), { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

