/**
 * TopBar.tsx
 * 
 * Top navigation bar component with canvas title, save button, and other controls.
 */

import React, { useState } from 'react';
import { ArrowLeft, Plus, Save, Loader2, WandSparkles, ShieldCheck, PackageOpen } from 'lucide-react';

interface TopBarProps {
    // Title
    canvasTitle: string;
    isEditingTitle: boolean;
    editingTitleValue: string;
    canvasTitleInputRef: React.RefObject<HTMLInputElement>;
    setCanvasTitle: (title: string) => void;
    setIsEditingTitle: (editing: boolean) => void;
    setEditingTitleValue: (value: string) => void;
    // Actions
    onSave: () => void | Promise<void>;
    onNew: () => void;
    onBack?: () => void;
    onCreateAdvertisingDraft?: () => void;
    onOpenBrandProfile?: () => void;
    onExport?: () => void;
    hasUnsavedChanges: boolean;
    lastAutoSaveTime?: number;
    // Layout
    isChatOpen?: boolean;
    // Theme
    canvasTheme: 'dark' | 'light';
}

export const TopBar: React.FC<TopBarProps> = ({
    canvasTitle,
    isEditingTitle,
    editingTitleValue,
    canvasTitleInputRef,
    setCanvasTitle,
    setIsEditingTitle,
    setEditingTitleValue,
    onSave,
    onNew,
    onBack,
    onCreateAdvertisingDraft,
    onOpenBrandProfile,
    onExport,
    hasUnsavedChanges,
    lastAutoSaveTime,
    isChatOpen = false,
    canvasTheme
}) => {
    const [showNewConfirm, setShowNewConfirm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleTitleBlur = () => {
        if (editingTitleValue.trim()) {
            setCanvasTitle(editingTitleValue.trim());
        } else {
            setEditingTitleValue(canvasTitle);
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (editingTitleValue.trim()) {
                setCanvasTitle(editingTitleValue.trim());
            }
            setIsEditingTitle(false);
        } else if (e.key === 'Escape') {
            setEditingTitleValue(canvasTitle);
            setIsEditingTitle(false);
        }
    };

    const handleTitleDoubleClick = () => {
        setEditingTitleValue(canvasTitle);
        setIsEditingTitle(true);
    };

    const handleNewClick = () => {
        if (hasUnsavedChanges) {
            setShowNewConfirm(true);
        } else {
            onNew();
        }
    };

    const handleSaveAndNew = async () => {
        try {
            setIsSaving(true);
            await onSave();
            setShowNewConfirm(false);
            onNew();
        } catch (error) {
            console.error("Failed to save and new:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscardAndNew = () => {
        setShowNewConfirm(false);
        onNew();
    };

    return (
        <>
            <div
                className="fixed left-0 top-0 z-50 flex h-16 items-center justify-between border-b border-[#dce1e7] bg-white/95 px-6 shadow-[0_4px_18px_rgba(31,42,68,0.06)] backdrop-blur pointer-events-none transition-all duration-300"
                style={{ width: isChatOpen ? 'calc(100% - 420px)' : '100%' }}
            >
                {/* Left: Logo & Title */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#dce1e7] text-[#667085] transition hover:border-[#2457d6] hover:text-[#2457d6]"
                            title="返回项目工作台"
                        >
                            <ArrowLeft size={17} />
                        </button>
                    )}
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2457d6] text-[10px] font-black text-white shadow-[3px_3px_0_#ff6b3d]">
                        AD
                    </div>
                    {isEditingTitle ? (
                        <input
                            ref={canvasTitleInputRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={handleTitleKeyDown}
                            className="studio-display min-w-[100px] border-b border-[#2457d6] bg-transparent font-semibold text-[#172033] outline-none"
                        />
                    ) : (
                        <span
                            className="studio-display cursor-pointer font-semibold text-[#172033] transition-colors hover:text-[#2457d6]"
                            onDoubleClick={handleTitleDoubleClick}
                            title="Double-click to rename"
                        >
                            {canvasTitle}
                        </span>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 pointer-events-auto">
                    {onExport && (
                        <button
                            onClick={onExport}
                            className="flex items-center gap-2 rounded-md border border-[#dce1e7] bg-white px-3 py-2 text-xs font-medium text-[#475467] transition hover:border-[#2457d6] hover:text-[#2457d6]"
                        >
                            <PackageOpen size={16} /> 导出
                        </button>
                    )}
                    {onOpenBrandProfile && (
                        <button
                            onClick={onOpenBrandProfile}
                            className="flex items-center gap-2 rounded-md border border-[#dce1e7] bg-white px-3 py-2 text-xs font-medium text-[#475467] transition hover:border-[#2457d6] hover:text-[#2457d6]"
                        >
                            <ShieldCheck size={16} /> 品牌规范
                        </button>
                    )}
                    {onCreateAdvertisingDraft && (
                        <button
                            onClick={onCreateAdvertisingDraft}
                            className="flex items-center gap-2 rounded-md border border-[#ffc2ae] bg-[#fff2ed] px-3 py-2 text-xs font-semibold text-[#a23d20] transition hover:bg-[#ffe5dc]"
                        >
                            <WandSparkles size={16} />
                            AI工作流草案
                        </button>
                    )}
                    {/* Auto-save notification - before save button */}
                    {lastAutoSaveTime && !hasUnsavedChanges && (
                        <div className={`text-[10px] font-medium px-2 py-1 rounded border animate-in fade-in duration-500 ${canvasTheme === 'dark'
                            ? 'text-neutral-500 border-neutral-800'
                            : 'text-neutral-400 border-neutral-100'
                            }`}>
                            Auto-saved {new Date(lastAutoSaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    <button
                        onClick={() => onSave()}
                        className="flex items-center gap-2 rounded-md border border-[#172033] bg-[#172033] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#2457d6]"
                    >
                        <Save size={16} />
                        保存
                    </button>
                    <button
                        onClick={handleNewClick}
                        className="flex items-center gap-2 rounded-md border border-[#dce1e7] bg-white px-3 py-2 text-xs font-medium text-[#475467] transition hover:border-[#2457d6] hover:text-[#2457d6]"
                    >
                        <Plus size={16} />
                        新建
                    </button>
                </div>
            </div>

            {/* Unsaved Changes Confirmation Modal */}
            {showNewConfirm && (
                <div className="fixed inset-0 bg-[#172033]/25 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className="w-[400px] rounded-2xl border border-[#dce1e7] bg-white p-6 text-[#172033] shadow-[0_28px_80px_rgba(23,32,51,0.2)]">
                        <h3 className="studio-display mb-2 text-lg font-semibold">尚未保存</h3>
                        <p className="mb-6 text-sm text-[#667085]">
                            当前画布有未保存修改。新建画布前是否保存？
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowNewConfirm(false)}
                                disabled={isSaving}
                                className="rounded-md border border-[#dce1e7] px-4 py-2 text-sm text-[#667085] transition-colors hover:bg-[#f2f4f7] disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleDiscardAndNew}
                                disabled={isSaving}
                                className="rounded-md bg-[#fff1f1] px-4 py-2 text-sm text-[#a52626] transition-colors hover:bg-[#ffe2e2] disabled:opacity-50"
                            >
                                放弃修改
                            </button>
                            <button
                                onClick={handleSaveAndNew}
                                disabled={isSaving}
                                className="flex items-center gap-2 rounded-md bg-[#172033] px-4 py-2 text-sm text-white transition-colors hover:bg-[#2457d6] disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        正在保存…
                                    </>
                                ) : (
                                    '保存并新建'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
