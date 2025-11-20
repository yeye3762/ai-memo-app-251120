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

// PATCH: 메모 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    const body = await request.json()
    const { title, content, category, tags } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = tags

    const { data, error } = await supabaseAdmin
      .from('memos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating memo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 })
    }

    revalidatePath('/')
    return NextResponse.json(mapDbRowToMemo(data))
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: 메모 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    const { error } = await supabaseAdmin.from('memos').delete().eq('id', id)

    if (error) {
      console.error('Error deleting memo:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

