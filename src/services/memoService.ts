import { Memo, MemoFormData } from '@/types/memo'
import { supabase } from '@/lib/supabase/browserClient'

// 데이터베이스 스키마와 Memo 인터페이스 간 변환
const mapDbRowToMemo = (row: any): Memo => ({
  id: row.id,
  title: row.title,
  content: row.content,
  category: row.category,
  tags: row.tags || [],
  summary: row.summary || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapMemoToDbRow = (memo: Memo | MemoFormData & { id?: string }) => ({
  title: memo.title,
  content: memo.content,
  category: memo.category,
  tags: memo.tags || [],
  summary: 'summary' in memo ? memo.summary : undefined,
})

export const memoService = {
  // 모든 메모 가져오기
  async fetchMemos(): Promise<Memo[]> {
    try {
      const { data, error } = await supabase
        .from('memos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching memos:', error)
        // 더 명확한 에러 메시지 제공
        throw new Error(
          `Failed to fetch memos: ${error.message || JSON.stringify(error)}`
        )
      }

      return (data || []).map(mapDbRowToMemo)
    } catch (err) {
      // 예상치 못한 에러 처리
      if (err instanceof Error) {
        throw err
      }
      throw new Error('Unknown error occurred while fetching memos')
    }
  },

  // 메모 생성
  async createMemo(formData: MemoFormData): Promise<Memo> {
    const { data, error } = await supabase
      .from('memos')
      .insert([mapMemoToDbRow(formData)])
      .select()
      .single()

    if (error) {
      console.error('Error creating memo:', error)
      throw error
    }

    return mapDbRowToMemo(data)
  },

  // 메모 업데이트
  async updateMemo(id: string, formData: MemoFormData): Promise<Memo> {
    const { data, error } = await supabase
      .from('memos')
      .update(mapMemoToDbRow(formData))
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating memo:', error)
      throw error
    }

    return mapDbRowToMemo(data)
  },

  // 메모 요약 업데이트
  async updateSummary(id: string, summary: string): Promise<Memo> {
    const { data, error } = await supabase
      .from('memos')
      .update({ summary })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating summary:', error)
      throw error
    }

    return mapDbRowToMemo(data)
  },

  // 메모 삭제
  async deleteMemo(id: string): Promise<void> {
    const { error } = await supabase.from('memos').delete().eq('id', id)

    if (error) {
      console.error('Error deleting memo:', error)
      throw error
    }
  },

  // 특정 메모 가져오기
  async getMemoById(id: string): Promise<Memo | null> {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 레코드를 찾을 수 없음
        return null
      }
      console.error('Error fetching memo:', error)
      throw error
    }

    return data ? mapDbRowToMemo(data) : null
  },

  // AI 태그 생성
  async generateTags(title: string, content: string): Promise<string[]> {
    try {
      const response = await fetch('/api/memos/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || '태그 생성에 실패했습니다')
        } else {
          const text = await response.text()
          throw new Error(`서버 오류 (${response.status}): 태그 생성에 실패했습니다`)
        }
      }

      const data = await response.json()
      return data.tags || []
    } catch (error) {
      console.error('Error generating tags:', error)
      throw error
    }
  },
}

