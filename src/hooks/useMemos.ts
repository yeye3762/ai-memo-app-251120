'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Memo, MemoFormData } from '@/types/memo'
import { memoService } from '@/services/memoService'
import { migrateLocalStorageToSupabase } from '@/utils/migrateLocalStorage'

export const useMemos = () => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // 메모 로드 및 마이그레이션
  useEffect(() => {
    const loadMemos = async () => {
      setLoading(true)
      setError(null)
      try {
        // 먼저 Supabase에서 데이터 로드
        let loadedMemos = await memoService.fetchMemos()
        
        // Supabase에 데이터가 없고 로컬 스토리지에 데이터가 있으면 마이그레이션
        if (loadedMemos.length === 0) {
          const migrated = await migrateLocalStorageToSupabase()
          if (migrated) {
            // 마이그레이션 후 다시 로드
            loadedMemos = await memoService.fetchMemos()
          }
        }
        
        setMemos(loadedMemos)
      } catch (err) {
        console.error('Failed to load memos:', err)
        setError(err instanceof Error ? err : new Error('Failed to load memos'))
      } finally {
        setLoading(false)
      }
    }

    loadMemos()
  }, [])

  // 메모 생성
  const createMemo = useCallback(
    async (formData: MemoFormData): Promise<Memo> => {
      try {
        const newMemo = await memoService.createMemo(formData)
        setMemos(prev => [newMemo, ...prev])
        return newMemo
      } catch (err) {
        console.error('Failed to create memo:', err)
        throw err
      }
    },
    []
  )

  // 메모 업데이트
  const updateMemo = useCallback(
    async (id: string, formData: MemoFormData): Promise<void> => {
      try {
        const updatedMemo = await memoService.updateMemo(id, formData)
        setMemos(prev =>
          prev.map(memo => (memo.id === id ? updatedMemo : memo))
        )
      } catch (err) {
        console.error('Failed to update memo:', err)
        throw err
      }
    },
    []
  )

  // 메모 요약 업데이트
  const updateMemoSummary = useCallback(
    async (id: string, summary: string): Promise<void> => {
      try {
        const updatedMemo = await memoService.updateSummary(id, summary)
        setMemos(prev =>
          prev.map(memo => (memo.id === id ? updatedMemo : memo))
        )
      } catch (err) {
        console.error('Failed to update summary:', err)
        throw err
      }
    },
    []
  )

  // 메모 삭제
  const deleteMemo = useCallback(async (id: string): Promise<void> => {
    try {
      await memoService.deleteMemo(id)
      setMemos(prev => prev.filter(memo => memo.id !== id))
    } catch (err) {
      console.error('Failed to delete memo:', err)
      throw err
    }
  }, [])

  // 메모 검색
  const searchMemos = useCallback((query: string): void => {
    setSearchQuery(query)
  }, [])

  // 카테고리 필터링
  const filterByCategory = useCallback((category: string): void => {
    setSelectedCategory(category)
  }, [])

  // 특정 메모 가져오기
  const getMemoById = useCallback(
    (id: string): Memo | undefined => {
      return memos.find(memo => memo.id === id)
    },
    [memos]
  )

  // 필터링된 메모 목록
  const filteredMemos = useMemo(() => {
    let filtered = memos

    // 카테고리 필터링
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory)
    }

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        memo =>
          memo.title.toLowerCase().includes(query) ||
          memo.content.toLowerCase().includes(query) ||
          memo.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [memos, selectedCategory, searchQuery])

  // 모든 메모 삭제
  const clearAllMemos = useCallback(async (): Promise<void> => {
    try {
      // 모든 메모를 순차적으로 삭제
      await Promise.all(memos.map(memo => memoService.deleteMemo(memo.id)))
      setMemos([])
      setSearchQuery('')
      setSelectedCategory('all')
    } catch (err) {
      console.error('Failed to clear memos:', err)
      throw err
    }
  }, [memos])

  // 통계 정보
  const stats = useMemo(() => {
    const totalMemos = memos.length
    const categoryCounts = memos.reduce(
      (acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      total: totalMemos,
      byCategory: categoryCounts,
      filtered: filteredMemos.length,
    }
  }, [memos, filteredMemos])

  return {
    // 상태
    memos: filteredMemos,
    allMemos: memos,
    loading,
    error,
    searchQuery,
    selectedCategory,
    stats,

    // 메모 CRUD
    createMemo,
    updateMemo,
    updateMemoSummary,
    deleteMemo,
    getMemoById,

    // 필터링 & 검색
    searchMemos,
    filterByCategory,

    // 유틸리티
    clearAllMemos,
  }
}
