interface Props {
  frameCount: number;
  currentFrameIndex: number;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: () => void;
  onPrevFrame: () => void;
  onNextFrame: () => void;
}

export function FramePanel({
  frameCount,
  currentFrameIndex,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onPrevFrame,
  onNextFrame,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Frames</h3>

      <div className="text-center text-sm font-medium text-gray-600 mb-3">
        Frame {currentFrameIndex + 1} / {frameCount}
      </div>

      {/* Navigation */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={onPrevFrame}
          disabled={currentFrameIndex <= 0}
          className="flex-1 py-1.5 text-sm font-medium rounded-lg transition bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Anterior
        </button>
        <button
          onClick={onNextFrame}
          disabled={currentFrameIndex >= frameCount - 1}
          className="flex-1 py-1.5 text-sm font-medium rounded-lg transition bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Siguiente →
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onAddFrame}
          className="w-full py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
        >
          + Nuevo frame
        </button>
        <button
          onClick={onDuplicateFrame}
          className="w-full py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
        >
          Duplicar frame
        </button>
        <button
          onClick={onDeleteFrame}
          disabled={frameCount <= 1}
          className="w-full py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Eliminar frame
        </button>
      </div>
    </div>
  );
}
