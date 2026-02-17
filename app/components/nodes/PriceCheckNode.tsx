"use client";

import { memo, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { DollarSign, MoreVertical } from "lucide-react";
import { useFlowStore } from "@/lib/hooks/useFlowStore";

export const PriceCheckNode = memo(({ data, selected, id }: NodeProps) => {
  const token = String(data.token ?? "ETH");
  const priceSource = String(data.priceSource ?? "CoinGecko");

  const updateNodeData = useFlowStore((state) => state.updateNodeData);

  const customColor = data.customColor as string | undefined;
  const defaultColor = "#14b8a6"; // teal-500
  const accentColor = customColor || defaultColor;

  const [showColorMenu, setShowColorMenu] = useState(false);

  useEffect(() => {
    const handleCloseMenus = () => setShowColorMenu(false);
    window.addEventListener("closeColorMenus", handleCloseMenus);
    return () =>
      window.removeEventListener("closeColorMenus", handleCloseMenus);
  }, []);

  const presetColors = [
    "#a855f7",
    "#f97316",
    "#3b82f6",
    "#06b6d4",
    "#10b981",
    "#eab308",
    "#f43f5e",
    "#8b5cf6",
    "#ec4899",
    "#84cc16",
  ];

  const handleColorChange = (color: string | undefined) => {
    updateNodeData(id, { customColor: color });
  };

  return (
    <div
      className={`min-w-[240px] rounded-xl overflow-visible transition-all relative ${
        selected
          ? "ring-2 shadow-2xl node-glow"
          : "ring-1 hover:ring-opacity-40"
      }`}
      style={{
        borderColor: selected ? accentColor : `${accentColor}33`,
        boxShadow: selected
          ? `0 20px 25px -5px ${accentColor}50, 0 8px 10px -6px ${accentColor}50`
          : undefined,
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowColorMenu(!showColorMenu);
        }}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded flex items-center justify-center
          bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all cursor-pointer"
      >
        <MoreVertical className="w-3.5 h-3.5 text-white" />
      </button>

      {showColorMenu && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowColorMenu(false)}
            onMouseDown={() => setShowColorMenu(false)}
          />
          <div
            className="absolute top-0 left-[calc(100%+8px)] z-[100] w-48 rounded-lg overflow-hidden shadow-2xl"
            style={{
              background: "rgba(15, 23, 42, 0.98)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-3 space-y-2">
              <div className="text-[9px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                Node Color
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-10 h-10 rounded border-2 border-slate-600 cursor-pointer hover:border-cyan-500/50 transition-all"
                  style={{ backgroundColor: accentColor }}
                />
                <input
                  type="text"
                  value={accentColor.toUpperCase()}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) handleColorChange(val);
                  }}
                  className="flex-1 h-8 px-2 bg-slate-900/80 border border-slate-700 rounded 
                    text-[10px] font-mono text-cyan-100 focus:border-cyan-500 focus:outline-none tracking-wider"
                  maxLength={7}
                />
              </div>
              <div className="text-[8px] font-mono font-semibold tracking-widest text-slate-500 uppercase">
                Quick Presets
              </div>
              <div className="grid grid-cols-5 gap-1">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`w-full aspect-square rounded border-2 transition-all hover:scale-110 cursor-pointer
                      ${accentColor === color ? "border-white ring-1 ring-white/30 scale-105" : "border-slate-700/50"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {customColor && (
                <button
                  onClick={() => {
                    handleColorChange(undefined);
                    setShowColorMenu(false);
                  }}
                  className="w-full py-1.5 text-[8px] font-mono text-slate-400 hover:text-cyan-400 
                    border border-slate-700 hover:border-cyan-500 rounded transition-all
                    hover:bg-slate-800/50 cursor-pointer"
                >
                  RESET
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div
        className="p-3 select-none rounded-t-xl"
        style={{
          background: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`,
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <DollarSign className="w-4 h-4" />
          <span className="font-bold text-sm">Price Check</span>
        </div>
      </div>

      <div className="bg-slate-900/95 backdrop-blur-xl p-3 border-t border-white/5 select-none rounded-b-xl">
        <div className="space-y-1">
          <div className="text-xs font-medium" style={{ color: accentColor }}>
            {token} price
          </div>
          <div className="text-[10px] text-slate-400">
            Source: {priceSource}
          </div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3"
        style={{ background: accentColor, borderColor: `${accentColor}cc` }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3"
        style={{ background: accentColor, borderColor: `${accentColor}cc` }}
      />
    </div>
  );
});

PriceCheckNode.displayName = "PriceCheckNode";
