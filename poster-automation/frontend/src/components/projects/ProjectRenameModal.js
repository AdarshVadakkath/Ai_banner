import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
export const ProjectRenameModal = ({ isOpen, onClose, currentName, onSave, }) => {
    const [name, setName] = useState(currentName);
    useEffect(() => {
        setName(currentName);
    }, [currentName]);
    if (!isOpen)
        return null;
    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSave(name.trim());
            onClose();
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in", children: _jsxs("div", { className: "bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200", children: [_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-100 mb-4", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Edit2, { className: "w-4 h-4 text-slate-700" }), _jsx("h3", { className: "font-bold text-slate-900 text-base", children: "Rename campaign" })] }), _jsx("button", { onClick: onClose, className: "text-slate-400 hover:text-slate-700 p-1 rounded-md", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs font-semibold text-slate-700 block mb-1", children: "Campaign name" }), _jsx("input", { type: "text", autoFocus: true, value: name, onChange: (e) => setName(e.target.value), className: "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800", placeholder: "Campaign name" })] }), _jsxs("div", { className: "flex items-center justify-end space-x-2 pt-2", children: [_jsx("button", { type: "button", onClick: onClose, className: "px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors", children: "Cancel" }), _jsx("button", { type: "submit", disabled: !name.trim(), className: "px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm", children: "Save name" })] })] })] }) }));
};
