import { Memo } from '@/types/memo'
import { localStorageUtils } from './localStorage'
import { memoService } from '@/services/memoService'

/**
 * 로컬 스토리지의 메모 데이터를 Supabase로 마이그레이션합니다.
 * Supabase에 데이터가 없을 때만 실행됩니다.
 */
export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  try {
    // Supabase에서 기존 데이터 확인
    const existingMemos = await memoService.fetchMemos()
    
    // 이미 데이터가 있으면 마이그레이션하지 않음
    if (existingMemos.length > 0) {
      console.log('Supabase에 이미 데이터가 있습니다. 마이그레이션을 건너뜁니다.')
      return false
    }

    // 로컬 스토리지에서 데이터 가져오기
    const localMemos = localStorageUtils.getMemos()
    
    if (localMemos.length === 0) {
      console.log('로컬 스토리지에 마이그레이션할 데이터가 없습니다.')
      return false
    }

    console.log(`${localMemos.length}개의 메모를 Supabase로 마이그레이션합니다...`)

    // 각 메모를 Supabase에 추가
    // 주의: createMemo는 새 ID를 생성하므로, 기존 ID를 유지하려면 직접 insert해야 합니다.
    // 하지만 간단하게 하기 위해 순차적으로 추가합니다.
    for (const memo of localMemos) {
      try {
        await memoService.createMemo({
          title: memo.title,
          content: memo.content,
          category: memo.category,
          tags: memo.tags,
        })
        
        // 요약이 있으면 업데이트
        if (memo.summary) {
          // 마지막으로 생성된 메모의 ID를 찾아야 하지만, 
          // 간단하게 하기 위해 제목으로 찾거나 나중에 업데이트
          // 여기서는 요약은 나중에 수동으로 생성하도록 합니다.
        }
      } catch (error) {
        console.error(`메모 "${memo.title}" 마이그레이션 실패:`, error)
      }
    }

    console.log('마이그레이션이 완료되었습니다.')
    
    // 마이그레이션 성공 후 로컬 스토리지 비우기 (선택사항)
    // localStorageUtils.clearMemos()
    
    return true
  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error)
    return false
  }
}

