'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Memo, MEMO_CATEGORIES } from '@/types/memo'
import '@uiw/react-markdown-preview/markdown.css'

const MarkdownPreview = dynamic(
  () => import('@uiw/react-markdown-preview').then(mod => mod.default || mod),
  {
    ssr: false,
    loading: () => (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    ),
  }
) as React.ComponentType<{ source: string; style?: React.CSSProperties; className?: string }>

interface MemoViewerProps {
  memo: Memo | null
  isOpen: boolean
  onClose: () => void
  onEdit: (memo: Memo) => void
  onDelete: (id: string) => void
  onSummaryUpdate?: (id: string, summary: string) => void
}

export default function MemoViewer({
  memo,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onSummaryUpdate,
}: MemoViewerProps) {
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  // 메모의 저장된 요약 또는 로컬 상태
  const summary = memo?.summary || null


  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  // 모달이 닫힐 때 에러 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSummaryError(null)
      setIsLoadingSummary(false)
    }
  }, [isOpen])

  if (!isOpen || !memo) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      personal: 'bg-blue-100 text-blue-800',
      work: 'bg-green-100 text-green-800',
      study: 'bg-purple-100 text-purple-800',
      idea: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800',
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleEdit = () => {
    onEdit(memo)
    onClose()
  }

  const handleDelete = () => {
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDelete(memo.id)
      onClose()
    }
  }

  const handleSummarize = async () => {
    if (!memo) return

    setIsLoadingSummary(true)
    setSummaryError(null)

    try {
      const response = await fetch('/api/memos/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: memo.id,
          content: memo.content,
          title: memo.title,
        }),
      })

      if (!response.ok) {
        // 응답이 JSON인지 확인
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || '요약 생성에 실패했습니다')
        } else {
          // HTML 응답인 경우 (에러 페이지)
          const text = await response.text()
          throw new Error(`서버 오류 (${response.status}): 요약 생성에 실패했습니다`)
        }
      }

      const data = await response.json()
      
      // 요약 자동 저장 (이미 DB에 저장됨)
      if (onSummaryUpdate && data.summary) {
        onSummaryUpdate(memo.id, data.summary)
      }
    } catch (error) {
      console.error('Summary error:', error)
      setSummaryError(
        error instanceof Error ? error.message : '요약 생성에 실패했습니다'
      )
    } finally {
      setIsLoadingSummary(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {memo.title}
              </h2>
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(memo.category)}`}
                >
                  {MEMO_CATEGORIES[memo.category as keyof typeof MEMO_CATEGORIES] ||
                    memo.category}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDate(memo.updatedAt)}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-4"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 내용 */}
          <div className="mb-6">
            <div data-color-mode="light">
              {memo.content ? (
                <MarkdownPreview
                  source={memo.content}
                  style={{ padding: 16 }}
                  className="markdown-body"
                />
              ) : (
                <p className="text-gray-500">내용이 없습니다.</p>
              )}
            </div>
          </div>

          {/* 태그 */}
          {memo.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex gap-2 flex-wrap">
                {memo.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 요약 섹션 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">요약</h3>
              <button
                onClick={handleSummarize}
                disabled={isLoadingSummary}
                className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 text-sm"
              >
                {isLoadingSummary ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    생성 중...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    {summary ? '다시 요약하기' : '요약 생성'}
                  </>
                )}
              </button>
            </div>

            {summaryError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-red-800 text-sm">{summaryError}</p>
              </div>
            )}

            {summary && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {summary}
                </p>
              </div>
            )}

            {!summary && !summaryError && !isLoadingSummary && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <p className="text-gray-500 text-sm">
                  위 버튼을 클릭하여 메모를 요약해보세요.
                </p>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 pt-4 border-t border-gray-200 justify-end">
            <button
              onClick={handleEdit}
              className="px-3 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5 text-sm"
              title="편집"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              편집
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center gap-1.5 text-sm"
              title="삭제"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

