'use client'

import { useState, useEffect } from 'react'
import { useMemos } from '@/hooks/useMemos'
import { Memo, MemoFormData } from '@/types/memo'
import MemoList from '@/components/MemoList'
import MemoForm from '@/components/MemoForm'
import MemoViewer from '@/components/MemoViewer'

export default function Home() {
  // MarkdownPreview 컴포넌트를 페이지 로드 시 미리 프리로드하여 모달 열 때 지연 방지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 약간의 지연 후 프리로드 (초기 렌더링 후)
      const timer = setTimeout(() => {
        import('@uiw/react-markdown-preview')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])
  const {
    memos,
    allMemos,
    loading,
    searchQuery,
    selectedCategory,
    stats,
    createMemo,
    updateMemo,
    updateMemoSummary,
    deleteMemo,
    searchMemos,
    filterByCategory,
  } = useMemos()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null)
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)

  const handleCreateMemo = async (formData: MemoFormData) => {
    try {
      await createMemo(formData)
      setIsFormOpen(false)
    } catch (error) {
      console.error('Failed to create memo:', error)
      alert('메모 생성에 실패했습니다.')
    }
  }

  const handleUpdateMemo = async (formData: MemoFormData) => {
    if (editingMemo) {
      try {
        await updateMemo(editingMemo.id, formData)
        setEditingMemo(null)
        setIsFormOpen(false)
      } catch (error) {
        console.error('Failed to update memo:', error)
        alert('메모 업데이트에 실패했습니다.')
      }
    }
  }

  const handleEditMemo = (memo: Memo) => {
    setEditingMemo(memo)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingMemo(null)
  }

  const handleOpenViewer = (memo: Memo) => {
    // 최신 메모 데이터 가져오기 (요약 포함)
    const latestMemo = allMemos.find(m => m.id === memo.id) || memo
    setSelectedMemo(latestMemo)
    setIsViewerOpen(true)
  }

  const handleCloseViewer = () => {
    setIsViewerOpen(false)
    setSelectedMemo(null)
  }

  const handleViewerEdit = (memo: Memo) => {
    handleCloseViewer()
    handleEditMemo(memo)
  }

  const handleViewerDelete = async (id: string) => {
    try {
      await deleteMemo(id)
      handleCloseViewer()
    } catch (error) {
      console.error('Failed to delete memo:', error)
      alert('메모 삭제에 실패했습니다.')
    }
  }

  const handleSummaryUpdate = async (id: string, summary: string) => {
    try {
      await updateMemoSummary(id, summary)
      // 선택된 메모도 업데이트
      if (selectedMemo && selectedMemo.id === id) {
        setSelectedMemo({ ...selectedMemo, summary })
      }
    } catch (error) {
      console.error('Failed to update summary:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">📝 메모 앱</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                새 메모
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MemoList
          memos={memos}
          loading={loading}
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
          onSearchChange={searchMemos}
          onCategoryChange={filterByCategory}
          onEditMemo={handleEditMemo}
          onDeleteMemo={deleteMemo}
          onViewMemo={handleOpenViewer}
          stats={stats}
        />
      </main>

      {/* 모달 폼 */}
      <MemoForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingMemo ? handleUpdateMemo : handleCreateMemo}
        editingMemo={editingMemo}
        onTagUpdate={async (id, tags) => {
          // 태그 업데이트 후 메모 목록 갱신을 위해 updateMemo 호출
          const memo = allMemos.find(m => m.id === id)
          if (memo) {
            await updateMemo(id, {
              title: memo.title,
              content: memo.content,
              category: memo.category,
              tags,
            })
          }
        }}
      />

      {/* 메모 상세 뷰어 */}
      <MemoViewer
        memo={selectedMemo}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
        onEdit={handleViewerEdit}
        onDelete={handleViewerDelete}
        onSummaryUpdate={handleSummaryUpdate}
      />
    </div>
  )
}
