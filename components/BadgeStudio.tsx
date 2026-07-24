"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Copy,
  Database,
  Download,
  FileSpreadsheet,
  ImagePlus,
  LayoutTemplate,
  LockKeyhole,
  MousePointer2,
  Plus,
  Printer,
  Settings2,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import Papa from "papaparse";
import {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Mode = "design" | "data" | "print";
type Align = "left" | "center" | "right";
type ElementKind = "variable" | "static";
type BackgroundFit = "cover" | "contain" | "stretch";
type PagePreset = "A4" | "A3" | "Letter" | "custom";

type TextElement = {
  id: string;
  kind: ElementKind;
  field?: string;
  value?: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: Align;
};

type BadgeRow = {
  id: string;
  [key: string]: string;
};

type PageSettings = {
  preset: PagePreset;
  width: number;
  height: number;
  gapX: number;
  gapY: number;
  showOutline: boolean;
  showCropMarks: boolean;
};

type DragState = {
  id: string;
  pointerX: number;
  pointerY: number;
  elementX: number;
  elementY: number;
};

const PAGE_PRESETS: Record<
  Exclude<PagePreset, "custom">,
  { width: number; height: number; label: string }
> = {
  A4: { width: 210, height: 297, label: "A4 · 210 × 297 mm" },
  A3: { width: 297, height: 420, label: "A3 · 297 × 420 mm" },
  Letter: { width: 215.9, height: 279.4, label: "Letter · 216 × 279 mm" },
};

const DEFAULT_FIELDS = ["이름", "팀", "직책"];
const SAMPLE_ROWS: BadgeRow[] = [
  { id: "row-1", 이름: "김민지", 팀: "브랜드팀", 직책: "디자이너" },
  { id: "row-2", 이름: "박준호", 팀: "제품팀", 직책: "프로덕트 매니저" },
  { id: "row-3", 이름: "이서연", 팀: "운영팀", 직책: "매니저" },
  { id: "row-4", 이름: "최현우", 팀: "개발팀", 직책: "엔지니어" },
];

const DEFAULT_ELEMENTS: TextElement[] = [
  {
    id: "element-team",
    kind: "variable",
    field: "팀",
    x: 8,
    y: 22,
    width: 79,
    fontSize: 11,
    fontWeight: 500,
    color: "#687076",
    align: "center",
  },
  {
    id: "element-name",
    kind: "variable",
    field: "이름",
    x: 8,
    y: 57,
    width: 79,
    fontSize: 25,
    fontWeight: 700,
    color: "#17201f",
    align: "center",
  },
  {
    id: "element-title",
    kind: "variable",
    field: "직책",
    x: 8,
    y: 79,
    width: 79,
    fontSize: 11,
    fontWeight: 500,
    color: "#687076",
    align: "center",
  },
];

const DEFAULT_PAGE: PageSettings = {
  preset: "A4",
  width: 210,
  height: 297,
  gapX: 0,
  gapY: 0,
  showOutline: true,
  showCropMarks: true,
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function displayNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function resolveText(
  element: TextElement,
  row: BadgeRow | undefined,
  showPlaceholder = true,
) {
  if (element.kind === "static") return element.value || "고정 문구";
  if (!element.field) return "";
  const value = row?.[element.field];
  return value || (showPlaceholder ? `{{${element.field}}}` : "");
}

function getPageLayout(
  page: PageSettings,
  badgeWidth: number,
  badgeHeight: number,
) {
  const columns = Math.max(
    0,
    Math.floor((page.width + page.gapX) / (badgeWidth + page.gapX)),
  );
  const rows = Math.max(
    0,
    Math.floor((page.height + page.gapY) / (badgeHeight + page.gapY)),
  );
  const capacity = columns * rows;
  const contentWidth =
    columns > 0 ? columns * badgeWidth + (columns - 1) * page.gapX : 0;
  const contentHeight =
    rows > 0 ? rows * badgeHeight + (rows - 1) * page.gapY : 0;

  return {
    columns,
    rows,
    capacity,
    startX: (page.width - contentWidth) / 2,
    startY: (page.height - contentHeight) / 2,
    fits: capacity > 0,
  };
}

function getImageType(dataUrl: string) {
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = src;
  });
}

async function renderBadgeImage({
  badgeWidth,
  badgeHeight,
  background,
  backgroundFit,
  elements,
  row,
  dpi,
}: {
  badgeWidth: number;
  badgeHeight: number;
  background: string | null;
  backgroundFit: BackgroundFit;
  elements: TextElement[];
  row: BadgeRow;
  dpi: number;
}) {
  const scale = dpi / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(badgeWidth * scale));
  canvas.height = Math.max(1, Math.round(badgeHeight * scale));
  const context = canvas.getContext("2d");

  if (!context) throw new Error("인쇄용 캔버스를 만들 수 없습니다.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (background) {
    const image = await loadImage(background);

    if (backgroundFit === "stretch") {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    } else {
      const scaleFactor =
        backgroundFit === "cover"
          ? Math.max(canvas.width / image.width, canvas.height / image.height)
          : Math.min(canvas.width / image.width, canvas.height / image.height);
      const drawWidth = image.width * scaleFactor;
      const drawHeight = image.height * scaleFactor;
      context.drawImage(
        image,
        (canvas.width - drawWidth) / 2,
        (canvas.height - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    }
  }

  for (const element of elements) {
    const text = resolveText(element, row, false);
    if (!text) continue;

    const maxWidth = element.width * scale;
    const intendedFontSize = element.fontSize * (dpi / 72);
    let fontSize = intendedFontSize;
    const fontFamily =
      '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
    context.font = `${element.fontWeight} ${fontSize}px ${fontFamily}`;

    const longestLine = text
      .split("\n")
      .reduce((longest, line) =>
        context.measureText(line).width > context.measureText(longest).width
          ? line
          : longest,
      );
    const measured = context.measureText(longestLine).width;

    if (measured > maxWidth) {
      fontSize = Math.max(intendedFontSize * 0.55, intendedFontSize * (maxWidth / measured));
      context.font = `${element.fontWeight} ${fontSize}px ${fontFamily}`;
    }

    context.fillStyle = element.color;
    context.textBaseline = "middle";
    context.textAlign = element.align;

    const x =
      element.align === "left"
        ? element.x * scale
        : element.align === "right"
          ? (element.x + element.width) * scale
          : (element.x + element.width / 2) * scale;
    const lines = text.split("\n");
    const lineHeight = fontSize * 1.18;
    const firstY =
      element.y * scale - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      context.fillText(line, x, firstY + index * lineHeight, maxWidth);
    });
  }

  return canvas.toDataURL("image/jpeg", 0.96);
}

function BadgeContents({
  badgeWidth,
  badgeHeight,
  safeArea = 5,
  background,
  backgroundFit,
  elements,
  row,
  selectedElementId,
  interactive = false,
  onSelect,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyMove,
}: {
  badgeWidth: number;
  badgeHeight: number;
  safeArea?: number;
  background: string | null;
  backgroundFit: BackgroundFit;
  elements: TextElement[];
  row: BadgeRow | undefined;
  selectedElementId?: string | null;
  interactive?: boolean;
  onSelect?: (id: string) => void;
  onPointerDown?: (
    event: ReactPointerEvent<HTMLDivElement>,
    element: TextElement,
  ) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onKeyMove?: (
    event: React.KeyboardEvent<HTMLDivElement>,
    element: TextElement,
  ) => void;
}) {
  const stageStyle = {
    "--badge-ratio": `${badgeWidth} / ${badgeHeight}`,
    backgroundImage: background ? `url("${background}")` : undefined,
    backgroundSize:
      backgroundFit === "stretch" ? "100% 100%" : backgroundFit,
  } as CSSProperties;

  return (
    <div
      className={`badge-surface ${interactive ? "is-interactive" : ""}`}
      style={stageStyle}
      onPointerMove={interactive ? onPointerMove : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerCancel={interactive ? onPointerUp : undefined}
    >
      {!background && interactive && (
        <div className="empty-background" aria-hidden="true">
          <ImagePlus size={22} />
          <span>배경 이미지를 추가해 보세요</span>
        </div>
      )}
      <div
        className="safe-area"
        style={{
          inset: `${(safeArea / badgeHeight) * 100}% ${(safeArea / badgeWidth) * 100}%`,
        }}
        aria-hidden="true"
      />
      {elements.map((element) => {
        const isSelected = selectedElementId === element.id;
        const style = {
          left: `${(element.x / badgeWidth) * 100}%`,
          top: `${(element.y / badgeHeight) * 100}%`,
          width: `${(element.width / badgeWidth) * 100}%`,
          fontSize: `${(element.fontSize * 0.352778 * 100) / badgeWidth}cqw`,
          fontWeight: element.fontWeight,
          color: element.color,
          textAlign: element.align,
          cursor: interactive ? "grab" : "default",
        } as CSSProperties;

        return (
          <div
            key={element.id}
            className={`badge-text ${isSelected ? "is-selected" : ""}`}
            style={style}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={
              interactive
                ? `${element.kind === "variable" ? element.field : element.value} 텍스트 요소`
                : undefined
            }
            onClick={
              interactive
                ? (event) => {
                    event.stopPropagation();
                    onSelect?.(element.id);
                  }
                : undefined
            }
            onPointerDown={
              interactive
                ? (event) => onPointerDown?.(event, element)
                : undefined
            }
            onKeyDown={
              interactive
                ? (event) => onKeyMove?.(event, element)
                : undefined
            }
          >
            {resolveText(element, row)}
            {interactive && isSelected && (
              <>
                <span className="selection-handle handle-nw" />
                <span className="selection-handle handle-ne" />
                <span className="selection-handle handle-sw" />
                <span className="selection-handle handle-se" />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BadgeStudio() {
  const [mode, setMode] = useState<Mode>("design");
  const [badgeWidth, setBadgeWidth] = useState(95);
  const [badgeHeight, setBadgeHeight] = useState(123);
  const [safeArea, setSafeArea] = useState(5);
  const [background, setBackground] = useState<string | null>(null);
  const [backgroundName, setBackgroundName] = useState("");
  const [backgroundFit, setBackgroundFit] = useState<BackgroundFit>("cover");
  const [elements, setElements] = useState<TextElement[]>(DEFAULT_ELEMENTS);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    "element-name",
  );
  const [fields, setFields] = useState<string[]>(DEFAULT_FIELDS);
  const [rows, setRows] = useState<BadgeRow[]>(SAMPLE_ROWS);
  const [selectedRowId, setSelectedRowId] = useState("row-1");
  const [page, setPage] = useState<PageSettings>(DEFAULT_PAGE);
  const [dpi, setDpi] = useState(300);
  const [newField, setNewField] = useState("");
  const [csvError, setCsvError] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const selectedElement =
    elements.find((element) => element.id === selectedElementId) || null;
  const selectedRow =
    rows.find((row) => row.id === selectedRowId) || rows[0];
  const layout = useMemo(
    () => getPageLayout(page, badgeWidth, badgeHeight),
    [page, badgeWidth, badgeHeight],
  );
  const pageCount =
    layout.capacity > 0 ? Math.max(1, Math.ceil(rows.length / layout.capacity)) : 0;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("badgeflow-project-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.badgeWidth === "number") setBadgeWidth(parsed.badgeWidth);
        if (typeof parsed.badgeHeight === "number")
          setBadgeHeight(parsed.badgeHeight);
        if (typeof parsed.safeArea === "number") setSafeArea(parsed.safeArea);
        if (Array.isArray(parsed.elements)) setElements(parsed.elements);
        if (Array.isArray(parsed.fields)) setFields(parsed.fields);
        if (Array.isArray(parsed.rows)) setRows(parsed.rows);
        if (parsed.page) setPage(parsed.page);
        if (parsed.backgroundFit) setBackgroundFit(parsed.backgroundFit);
      }
    } catch {
      // A malformed local draft should never block the editor.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          "badgeflow-project-v1",
          JSON.stringify({
            badgeWidth,
            badgeHeight,
            safeArea,
            elements,
            fields,
            rows,
            page,
            backgroundFit,
          }),
        );
      } catch {
        // Background images are intentionally kept in memory, so quota errors are harmless.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    badgeWidth,
    badgeHeight,
    safeArea,
    elements,
    fields,
    rows,
    page,
    backgroundFit,
  ]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateElement(id: string, patch: Partial<TextElement>) {
    setElements((current) =>
      current.map((element) =>
        element.id === id ? { ...element, ...patch } : element,
      ),
    );
  }

  function addVariableElement(field: string) {
    const element: TextElement = {
      id: makeId("element"),
      kind: "variable",
      field,
      x: 10,
      y: clamp(30 + elements.length * 8, 12, badgeHeight - 12),
      width: Math.max(20, badgeWidth - 20),
      fontSize: field === "이름" ? 22 : 12,
      fontWeight: field === "이름" ? 700 : 500,
      color: "#17201f",
      align: "center",
    };
    setElements((current) => [...current, element]);
    setSelectedElementId(element.id);
  }

  function addStaticElement() {
    const element: TextElement = {
      id: makeId("element"),
      kind: "static",
      value: "행사명",
      x: 10,
      y: 102,
      width: Math.max(20, badgeWidth - 20),
      fontSize: 10,
      fontWeight: 600,
      color: "#0d9488",
      align: "center",
    };
    setElements((current) => [...current, element]);
    setSelectedElementId(element.id);
  }

  function duplicateSelected() {
    if (!selectedElement) return;
    const duplicate = {
      ...selectedElement,
      id: makeId("element"),
      x: clamp(selectedElement.x + 3, 0, badgeWidth - selectedElement.width),
      y: clamp(selectedElement.y + 3, 0, badgeHeight),
    };
    setElements((current) => [...current, duplicate]);
    setSelectedElementId(duplicate.id);
  }

  function deleteSelected() {
    if (!selectedElementId) return;
    setElements((current) =>
      current.filter((element) => element.id !== selectedElementId),
    );
    setSelectedElementId(null);
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    element: TextElement,
  ) {
    if (!stageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedElementId(element.id);
    setDrag({
      id: element.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      elementX: element.x,
      elementY: element.y,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const element = elements.find((item) => item.id === drag.id);
    if (!element) return;
    const nextX =
      drag.elementX + ((event.clientX - drag.pointerX) / rect.width) * badgeWidth;
    const nextY =
      drag.elementY + ((event.clientY - drag.pointerY) / rect.height) * badgeHeight;
    updateElement(drag.id, {
      x: Math.round(clamp(nextX, 0, badgeWidth - element.width) * 10) / 10,
      y: Math.round(clamp(nextY, 0, badgeHeight) * 10) / 10,
    });
  }

  function handleKeyMove(
    event: React.KeyboardEvent<HTMLDivElement>,
    element: TextElement,
  ) {
    const amount = event.shiftKey ? 2 : 0.5;
    const keyMap: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -amount, y: 0 },
      ArrowRight: { x: amount, y: 0 },
      ArrowUp: { x: 0, y: -amount },
      ArrowDown: { x: 0, y: amount },
    };
    if (keyMap[event.key]) {
      event.preventDefault();
      updateElement(element.id, {
        x: clamp(element.x + keyMap[event.key].x, 0, badgeWidth - element.width),
        y: clamp(element.y + keyMap[event.key].y, 0, badgeHeight),
      });
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      setSelectedElementId(element.id);
      setElements((current) =>
        current.filter((item) => item.id !== element.id),
      );
    }
  }

  function handleBackground(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("PNG, JPG, WebP 이미지 파일을 선택해 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBackground(String(reader.result));
      setBackgroundName(file.name);
      setToast("배경 이미지를 적용했습니다.");
    };
    reader.readAsDataURL(file);
  }

  function handleCsv(file: File | undefined) {
    if (!file) return;
    setCsvError("");
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (result) => {
        const importedFields = (result.meta.fields || [])
          .map((field) => field.trim())
          .filter(Boolean);
        if (!importedFields.length || !result.data.length) {
          setCsvError("헤더와 한 개 이상의 데이터 행이 있는 CSV가 필요합니다.");
          return;
        }
        const importedRows = result.data.map((row) => {
          const normalized: BadgeRow = { id: makeId("row") };
          importedFields.forEach((field) => {
            normalized[field] = String(row[field] ?? "");
          });
          return normalized;
        });
        setFields(importedFields);
        setRows(importedRows);
        setSelectedRowId(importedRows[0].id);
        setToast(`${importedRows.length}명의 데이터를 불러왔습니다.`);
      },
      error: () => {
        setCsvError("CSV 파일을 읽지 못했습니다. UTF-8 형식인지 확인해 주세요.");
      },
    });
  }

  function addField() {
    const value = newField.trim();
    if (!value || fields.includes(value)) return;
    setFields((current) => [...current, value]);
    setRows((current) => current.map((row) => ({ ...row, [value]: "" })));
    setNewField("");
  }

  function removeField(field: string) {
    if (fields.length <= 1) {
      setToast("필드는 최소 한 개가 필요합니다.");
      return;
    }
    setFields((current) => current.filter((item) => item !== field));
    setRows((current) =>
      current.map((row) => {
        const next = { ...row };
        delete next[field];
        return next;
      }),
    );
    setElements((current) =>
      current.filter(
        (element) => element.kind !== "variable" || element.field !== field,
      ),
    );
  }

  function addRow() {
    const row: BadgeRow = { id: makeId("row") };
    fields.forEach((field) => {
      row[field] = "";
    });
    setRows((current) => [...current, row]);
    setSelectedRowId(row.id);
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
    if (selectedRowId === id) {
      const nextRow = rows.find((row) => row.id !== id);
      setSelectedRowId(nextRow?.id || "");
    }
  }

  function updateRow(id: string, field: string, value: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  }

  function setPagePreset(preset: PagePreset) {
    if (preset === "custom") {
      setPage((current) => ({ ...current, preset }));
      return;
    }
    const dimensions = PAGE_PRESETS[preset];
    setPage((current) => ({
      ...current,
      preset,
      width: dimensions.width,
      height: dimensions.height,
    }));
  }

  async function exportPdf() {
    if (!layout.fits) {
      setToast("명찰이 용지보다 큽니다. 크기 설정을 확인해 주세요.");
      return;
    }
    if (!rows.length) {
      setToast("먼저 명찰 데이터를 한 행 이상 추가해 주세요.");
      return;
    }

    setIsExporting(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: page.width > page.height ? "landscape" : "portrait",
        unit: "mm",
        format: [page.width, page.height],
        compress: true,
      });
      doc.setProperties({
        title: "BadgeFlow 명찰 인쇄",
        subject: `${badgeWidth} × ${badgeHeight} mm 명찰`,
        creator: "BadgeFlow",
      });

      const badgeCache = new Map<string, string>();
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        if (pageIndex > 0) {
          doc.addPage(
            [page.width, page.height],
            page.width > page.height ? "landscape" : "portrait",
          );
        }
        const pageRows = rows.slice(
          pageIndex * layout.capacity,
          (pageIndex + 1) * layout.capacity,
        );

        for (let index = 0; index < pageRows.length; index += 1) {
          const row = pageRows[index];
          const column = index % layout.columns;
          const rowIndex = Math.floor(index / layout.columns);
          const x = layout.startX + column * (badgeWidth + page.gapX);
          const y = layout.startY + rowIndex * (badgeHeight + page.gapY);
          let rendered = badgeCache.get(row.id);
          if (!rendered) {
            rendered = await renderBadgeImage({
              badgeWidth,
              badgeHeight,
              background,
              backgroundFit,
              elements,
              row,
              dpi,
            });
            badgeCache.set(row.id, rendered);
          }

          doc.addImage(
            rendered,
            getImageType(rendered),
            x,
            y,
            badgeWidth,
            badgeHeight,
            undefined,
            "FAST",
          );

          if (page.showOutline) {
            doc.setDrawColor(116, 116, 116);
            doc.setLineWidth(0.12);
            doc.rect(x, y, badgeWidth, badgeHeight);
          }

          if (page.showCropMarks) {
            const mark = 3;
            const offset = 1;
            doc.setDrawColor(75, 75, 75);
            doc.setLineWidth(0.15);
            [
              [x - offset - mark, y, x - offset, y],
              [x, y - offset - mark, x, y - offset],
              [x + badgeWidth + offset, y, x + badgeWidth + offset + mark, y],
              [
                x + badgeWidth,
                y - offset - mark,
                x + badgeWidth,
                y - offset,
              ],
              [
                x - offset - mark,
                y + badgeHeight,
                x - offset,
                y + badgeHeight,
              ],
              [
                x,
                y + badgeHeight + offset,
                x,
                y + badgeHeight + offset + mark,
              ],
              [
                x + badgeWidth + offset,
                y + badgeHeight,
                x + badgeWidth + offset + mark,
                y + badgeHeight,
              ],
              [
                x + badgeWidth,
                y + badgeHeight + offset,
                x + badgeWidth,
                y + badgeHeight + offset + mark,
              ],
            ].forEach(([x1, y1, x2, y2]) => doc.line(x1, y1, x2, y2));
          }
        }
      }

      const date = new Date().toISOString().slice(0, 10);
      doc.save(`명찰_${badgeWidth}x${badgeHeight}mm_${date}.pdf`);
      setToast("인쇄용 PDF를 만들었습니다.");
    } catch (error) {
      console.error(error);
      setToast("PDF 생성 중 문제가 생겼습니다. 다시 시도해 주세요.");
    } finally {
      setIsExporting(false);
    }
  }

  const modeItems: Array<{
    id: Mode;
    label: string;
    icon: typeof LayoutTemplate;
  }> = [
    { id: "design", label: "디자인", icon: LayoutTemplate },
    { id: "data", label: "데이터", icon: Database },
    { id: "print", label: "출력", icon: Printer },
  ];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        편집 영역으로 건너뛰기
      </a>
      <header className="topbar">
        <button
          className="brand"
          type="button"
          onClick={() => setMode("design")}
          aria-label="BadgeFlow 디자인 화면으로 이동"
        >
          <span className="brand-mark">B</span>
          <span>
            <strong>BadgeFlow</strong>
            <small>명찰 인쇄 스튜디오</small>
          </span>
        </button>

        <nav className="mode-nav" aria-label="작업 단계">
          {modeItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? "is-active" : ""}
                onClick={() => setMode(item.id)}
                aria-current={mode === item.id ? "page" : undefined}
              >
                <span className="step-number">{index + 1}</span>
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="topbar-actions">
          <span className="save-state" title="이 브라우저에 자동 저장됩니다">
            <Check size={14} />
            자동 저장
          </span>
          <button
            className="primary-button top-export"
            type="button"
            onClick={exportPdf}
            disabled={isExporting}
          >
            <Download size={17} />
            {isExporting ? "PDF 만드는 중…" : "PDF 만들기"}
          </button>
        </div>
      </header>

      <main id="main-content" className="main-content">
        {mode === "design" && (
          <div className="design-workspace">
            <aside className="panel left-panel" aria-label="디자인 도구">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">SETUP</span>
                  <h1>명찰 디자인</h1>
                </div>
                <span className="dimension-badge">
                  {displayNumber(badgeWidth)} × {displayNumber(badgeHeight)} mm
                </span>
              </div>

              <section className="panel-section">
                <div className="section-title">
                  <h2>명찰 크기</h2>
                  <span>mm</span>
                </div>
                <div className="field-grid two-columns">
                  <label>
                    너비
                    <input
                      type="number"
                      min="20"
                      max="500"
                      step="0.5"
                      value={badgeWidth}
                      onChange={(event) =>
                        setBadgeWidth(Math.max(20, Number(event.target.value)))
                      }
                    />
                  </label>
                  <label>
                    높이
                    <input
                      type="number"
                      min="20"
                      max="500"
                      step="0.5"
                      value={badgeHeight}
                      onChange={(event) =>
                        setBadgeHeight(Math.max(20, Number(event.target.value)))
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="preset-button"
                  onClick={() => {
                    setBadgeWidth(95);
                    setBadgeHeight(123);
                  }}
                >
                  <span>목걸이 명찰</span>
                  <strong>95 × 123</strong>
                </button>
              </section>

              <section className="panel-section">
                <div className="section-title">
                  <h2>배경 이미지</h2>
                  <span className="private-label">
                    <LockKeyhole size={12} /> 브라우저에서만 처리
                  </span>
                </div>
                <label className="upload-dropzone">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      handleBackground(event.target.files?.[0])
                    }
                  />
                  {background ? (
                    <>
                      <span
                        className="background-thumb"
                        style={{ backgroundImage: `url("${background}")` }}
                      />
                      <span className="upload-copy">
                        <strong>{backgroundName || "배경 이미지"}</strong>
                        <small>클릭해서 이미지 바꾸기</small>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="upload-icon">
                        <ImagePlus size={20} />
                      </span>
                      <span className="upload-copy">
                        <strong>이미지 선택</strong>
                        <small>PNG, JPG, WebP · 최대 품질 유지</small>
                      </span>
                    </>
                  )}
                </label>
                {background && (
                  <div className="inline-actions">
                    <label className="compact-select">
                      맞춤
                      <select
                        value={backgroundFit}
                        onChange={(event) =>
                          setBackgroundFit(event.target.value as BackgroundFit)
                        }
                      >
                        <option value="cover">가득 채우기</option>
                        <option value="contain">전체 보이기</option>
                        <option value="stretch">늘려 맞추기</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      className="icon-text-button danger-text"
                      onClick={() => {
                        setBackground(null);
                        setBackgroundName("");
                      }}
                    >
                      <Trash2 size={15} />
                      제거
                    </button>
                  </div>
                )}
              </section>

              <section className="panel-section grow-section">
                <div className="section-title">
                  <h2>텍스트 추가</h2>
                  <span>{elements.length}개 요소</span>
                </div>
                <p className="section-helper">
                  매개변수를 누르면 명찰에 텍스트가 추가됩니다.
                </p>
                <div className="variable-list">
                  {fields.map((field) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => addVariableElement(field)}
                    >
                      <span className="variable-icon">
                        <Type size={15} />
                      </span>
                      <span>
                        <strong>{field}</strong>
                        <small>{`{{${field}}}`}</small>
                      </span>
                      <Plus size={16} />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-button full-width"
                  onClick={addStaticElement}
                >
                  <Plus size={16} />
                  고정 문구 추가
                </button>
              </section>
            </aside>

            <section className="canvas-workspace" aria-label="명찰 편집 캔버스">
              <div className="canvas-toolbar">
                <div>
                  <span className="status-dot" />
                  <strong>앞면</strong>
                  <span>안전영역 {safeArea} mm</span>
                </div>
                <div className="toolbar-controls">
                  <label>
                    미리 볼 데이터
                    <select
                      value={selectedRow?.id || ""}
                      onChange={(event) => setSelectedRowId(event.target.value)}
                    >
                      {rows.map((row, index) => (
                        <option key={row.id} value={row.id}>
                          {row.이름 || `명찰 ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div
                className="canvas-stage"
                onClick={() => setSelectedElementId(null)}
              >
                <div className="measurement measurement-top">
                  <span>0</span>
                  <strong>{displayNumber(badgeWidth)} mm</strong>
                </div>
                <div className="measurement measurement-left">
                  <span>0</span>
                  <strong>{displayNumber(badgeHeight)} mm</strong>
                </div>
                <div
                  className="badge-frame"
                  ref={stageRef}
                  style={{ "--frame-ratio": `${badgeWidth} / ${badgeHeight}` } as CSSProperties}
                >
                  <BadgeContents
                    badgeWidth={badgeWidth}
                    badgeHeight={badgeHeight}
                    safeArea={safeArea}
                    background={background}
                    backgroundFit={backgroundFit}
                    elements={elements}
                    row={selectedRow}
                    selectedElementId={selectedElementId}
                    interactive
                    onSelect={setSelectedElementId}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={() => setDrag(null)}
                    onKeyMove={handleKeyMove}
                  />
                </div>
              </div>

              <div className="canvas-footer">
                <span>
                  <MousePointer2 size={15} />
                  드래그해서 이동 · 방향키 0.5mm · Shift + 방향키 2mm
                </span>
                <label>
                  안전영역
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={safeArea}
                    onChange={(event) => setSafeArea(Number(event.target.value))}
                  />
                  <strong>{safeArea} mm</strong>
                </label>
              </div>
            </section>

            <aside className="panel right-panel" aria-label="요소 속성">
              <div className="panel-heading compact">
                <div>
                  <span className="eyebrow">INSPECTOR</span>
                  <h2>요소 속성</h2>
                </div>
                <Settings2 size={19} />
              </div>

              {selectedElement ? (
                <>
                  <section className="panel-section selected-summary">
                    <span className="element-type-icon">
                      <Type size={17} />
                    </span>
                    <div>
                      <strong>
                        {selectedElement.kind === "variable"
                          ? selectedElement.field
                          : selectedElement.value}
                      </strong>
                      <small>
                        {selectedElement.kind === "variable"
                          ? "매개변수 텍스트"
                          : "고정 텍스트"}
                      </small>
                    </div>
                    <span className="selected-check">
                      <Check size={13} />
                    </span>
                  </section>

                  <section className="panel-section">
                    <div className="section-title">
                      <h2>내용</h2>
                    </div>
                    {selectedElement.kind === "variable" ? (
                      <label className="stacked-field">
                        연결할 매개변수
                        <select
                          value={selectedElement.field || ""}
                          onChange={(event) =>
                            updateElement(selectedElement.id, {
                              field: event.target.value,
                            })
                          }
                        >
                          {fields.map((field) => (
                            <option key={field} value={field}>
                              {field}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="stacked-field">
                        표시할 문구
                        <input
                          value={selectedElement.value || ""}
                          onChange={(event) =>
                            updateElement(selectedElement.id, {
                              value: event.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                  </section>

                  <section className="panel-section">
                    <div className="section-title">
                      <h2>타이포그래피</h2>
                    </div>
                    <div className="field-grid two-columns">
                      <label>
                        크기
                        <div className="input-with-unit">
                          <input
                            type="number"
                            min="6"
                            max="120"
                            value={selectedElement.fontSize}
                            onChange={(event) =>
                              updateElement(selectedElement.id, {
                                fontSize: Number(event.target.value),
                              })
                            }
                          />
                          <span>pt</span>
                        </div>
                      </label>
                      <label>
                        굵기
                        <select
                          value={selectedElement.fontWeight}
                          onChange={(event) =>
                            updateElement(selectedElement.id, {
                              fontWeight: Number(event.target.value),
                            })
                          }
                        >
                          <option value="400">보통</option>
                          <option value="500">중간</option>
                          <option value="600">세미볼드</option>
                          <option value="700">볼드</option>
                          <option value="800">엑스트라볼드</option>
                        </select>
                      </label>
                    </div>
                    <div className="property-row">
                      <div className="align-control" aria-label="텍스트 정렬">
                        {(
                          [
                            ["left", AlignLeft],
                            ["center", AlignCenter],
                            ["right", AlignRight],
                          ] as const
                        ).map(([align, Icon]) => (
                          <button
                            key={align}
                            type="button"
                            className={
                              selectedElement.align === align ? "is-active" : ""
                            }
                            onClick={() =>
                              updateElement(selectedElement.id, { align })
                            }
                            aria-label={
                              align === "left"
                                ? "왼쪽 정렬"
                                : align === "center"
                                  ? "가운데 정렬"
                                  : "오른쪽 정렬"
                            }
                          >
                            <Icon size={17} />
                          </button>
                        ))}
                      </div>
                      <label className="color-control">
                        <input
                          type="color"
                          value={selectedElement.color}
                          onChange={(event) =>
                            updateElement(selectedElement.id, {
                              color: event.target.value,
                            })
                          }
                          aria-label="텍스트 색상"
                        />
                        <span>{selectedElement.color.toUpperCase()}</span>
                      </label>
                    </div>
                  </section>

                  <section className="panel-section">
                    <div className="section-title">
                      <h2>위치와 너비</h2>
                      <span>mm</span>
                    </div>
                    <div className="field-grid three-columns">
                      <label>
                        X
                        <input
                          type="number"
                          step="0.5"
                          value={selectedElement.x}
                          onChange={(event) =>
                            updateElement(selectedElement.id, {
                              x: clamp(
                                Number(event.target.value),
                                0,
                                badgeWidth - selectedElement.width,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Y
                        <input
                          type="number"
                          step="0.5"
                          value={selectedElement.y}
                          onChange={(event) =>
                            updateElement(selectedElement.id, {
                              y: clamp(Number(event.target.value), 0, badgeHeight),
                            })
                          }
                        />
                      </label>
                      <label>
                        너비
                        <input
                          type="number"
                          step="0.5"
                          min="5"
                          value={selectedElement.width}
                          onChange={(event) =>
                            updateElement(selectedElement.id, {
                              width: clamp(
                                Number(event.target.value),
                                5,
                                badgeWidth - selectedElement.x,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <div className="inspector-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={duplicateSelected}
                    >
                      <Copy size={16} />
                      복제
                    </button>
                    <button
                      type="button"
                      className="secondary-button danger-text"
                      onClick={deleteSelected}
                    >
                      <Trash2 size={16} />
                      삭제
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-inspector">
                  <span>
                    <MousePointer2 size={23} />
                  </span>
                  <h3>텍스트를 선택하세요</h3>
                  <p>
                    캔버스의 텍스트를 누르면 크기, 색상, 위치를 정밀하게
                    조절할 수 있어요.
                  </p>
                </div>
              )}

              <div className="reference-note">
                <span className="reference-kicker">REFERENCE READY</span>
                <strong>A4 · 95 × 123 mm · 4-UP</strong>
                <p>제공해 주신 인쇄 양식과 같은 실제 크기 배치입니다.</p>
              </div>
            </aside>
          </div>
        )}

        {mode === "data" && (
          <div className="data-workspace">
            <section className="data-main">
              <div className="workspace-heading">
                <div>
                  <span className="eyebrow">DATA SOURCE</span>
                  <h1>명찰 데이터</h1>
                  <p>
                    CSV를 불러오거나 표에 직접 입력하세요. 한 행이 명찰 한
                    장이 됩니다.
                  </p>
                </div>
                <div className="heading-actions">
                  <label className="secondary-button file-button">
                    <Upload size={16} />
                    CSV 업로드
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) => handleCsv(event.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={addRow}
                  >
                    <Plus size={17} />행 추가
                  </button>
                </div>
              </div>

              {csvError && (
                <div className="error-message" role="alert">
                  {csvError}
                </div>
              )}

              <div className="data-toolbar">
                <span>
                  <FileSpreadsheet size={17} />
                  총 <strong>{rows.length}</strong>명
                </span>
                <span className="data-hint">
                  첫 행을 헤더로 인식합니다 · UTF-8 CSV 권장
                </span>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="row-number">#</th>
                      {fields.map((field) => (
                        <th key={field}>
                          <span>{field}</span>
                          <button
                            type="button"
                            onClick={() => removeField(field)}
                            aria-label={`${field} 필드 삭제`}
                          >
                            <X size={13} />
                          </button>
                        </th>
                      ))}
                      <th className="row-actions">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr
                        key={row.id}
                        className={
                          selectedRowId === row.id ? "is-selected" : ""
                        }
                        onClick={() => setSelectedRowId(row.id)}
                      >
                        <td className="row-number">{rowIndex + 1}</td>
                        {fields.map((field) => (
                          <td key={field}>
                            <input
                              value={row[field] || ""}
                              onChange={(event) =>
                                updateRow(row.id, field, event.target.value)
                              }
                              aria-label={`${rowIndex + 1}행 ${field}`}
                            />
                          </td>
                        ))}
                        <td className="row-actions">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeRow(row.id);
                            }}
                            aria-label={`${rowIndex + 1}행 삭제`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && (
                  <div className="empty-table">
                    <Database size={24} />
                    <strong>아직 데이터가 없습니다</strong>
                    <span>CSV를 올리거나 행을 추가해 시작하세요.</span>
                  </div>
                )}
              </div>

              <button type="button" className="add-row-bar" onClick={addRow}>
                <Plus size={16} />
                새 행 추가
              </button>
            </section>

            <aside className="data-side panel">
              <div className="panel-heading compact">
                <div>
                  <span className="eyebrow">SCHEMA</span>
                  <h2>매개변수 관리</h2>
                </div>
                <span className="count-badge">{fields.length}</span>
              </div>
              <section className="panel-section">
                <p className="section-helper">
                  CSV의 열 이름이 텍스트 매개변수가 됩니다.
                </p>
                <div className="schema-list">
                  {fields.map((field) => (
                    <div key={field}>
                      <span className="variable-icon">
                        <Type size={15} />
                      </span>
                      <span>
                        <strong>{field}</strong>
                        <small>{`{{${field}}}`}</small>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField(field)}
                        aria-label={`${field} 필드 삭제`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="add-field-control">
                  <label htmlFor="new-field">새 매개변수</label>
                  <div>
                    <input
                      id="new-field"
                      value={newField}
                      onChange={(event) => setNewField(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addField();
                      }}
                      placeholder="예: 사번"
                    />
                    <button
                      type="button"
                      onClick={addField}
                      aria-label="매개변수 추가"
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                </div>
              </section>

              <section className="panel-section csv-guide">
                <span className="guide-icon">
                  <FileSpreadsheet size={19} />
                </span>
                <div>
                  <strong>CSV 형식 예시</strong>
                  <code>이름,팀,직책</code>
                  <code>김민지,브랜드팀,디자이너</code>
                </div>
              </section>

              <button
                type="button"
                className="secondary-button full-width"
                onClick={() => {
                  setFields(DEFAULT_FIELDS);
                  setRows(SAMPLE_ROWS);
                  setSelectedRowId(SAMPLE_ROWS[0].id);
                  setToast("예시 데이터를 채웠습니다.");
                }}
              >
                예시 데이터 채우기
              </button>

              <div className="side-next-step">
                <span>다음 단계</span>
                <strong>{rows.length}개 명찰 출력 준비</strong>
                <button
                  type="button"
                  className="primary-button full-width"
                  onClick={() => setMode("print")}
                >
                  출력 설정으로
                  <Printer size={16} />
                </button>
              </div>
            </aside>
          </div>
        )}

        {mode === "print" && (
          <div className="print-workspace">
            <section className="print-preview-section">
              <div className="workspace-heading print-heading">
                <div>
                  <span className="eyebrow">PRINT PREVIEW</span>
                  <h1>인쇄 미리보기</h1>
                  <p>
                    용지 중앙에 자동 배치됩니다. PDF 인쇄 시 배율은 반드시
                    100% 또는 실제 크기를 선택하세요.
                  </p>
                </div>
                <div className="print-stats">
                  <span>
                    <strong>{layout.capacity}</strong>
                    장/페이지
                  </span>
                  <span>
                    <strong>{pageCount}</strong>
                    페이지
                  </span>
                </div>
              </div>

              <div className="print-preview-area">
                <div
                  className="page-preview"
                  style={
                    {
                      "--page-ratio": `${page.width} / ${page.height}`,
                    } as CSSProperties
                  }
                >
                  {layout.fits &&
                    rows.slice(0, layout.capacity).map((row, index) => {
                      const column = index % layout.columns;
                      const rowIndex = Math.floor(index / layout.columns);
                      const x =
                        layout.startX +
                        column * (badgeWidth + page.gapX);
                      const y =
                        layout.startY +
                        rowIndex * (badgeHeight + page.gapY);
                      return (
                        <div
                          className={`page-badge ${page.showOutline ? "with-outline" : ""}`}
                          key={row.id}
                          style={{
                            left: `${(x / page.width) * 100}%`,
                            top: `${(y / page.height) * 100}%`,
                            width: `${(badgeWidth / page.width) * 100}%`,
                            height: `${(badgeHeight / page.height) * 100}%`,
                          }}
                        >
                          <BadgeContents
                            badgeWidth={badgeWidth}
                            badgeHeight={badgeHeight}
                            background={background}
                            backgroundFit={backgroundFit}
                            elements={elements}
                            row={row}
                          />
                        </div>
                      );
                    })}
                  {!layout.fits && (
                    <div className="page-error">
                      <strong>명찰이 용지보다 큽니다</strong>
                      <span>명찰 또는 용지 크기를 조정해 주세요.</span>
                    </div>
                  )}
                </div>
                <div className="page-caption">
                  <span>
                    1 / {pageCount || 1} 페이지
                  </span>
                  <strong>
                    {displayNumber(page.width)} × {displayNumber(page.height)} mm
                  </strong>
                </div>
              </div>
            </section>

            <aside className="panel print-settings">
              <div className="panel-heading compact">
                <div>
                  <span className="eyebrow">OUTPUT</span>
                  <h2>출력 설정</h2>
                </div>
                <Printer size={19} />
              </div>

              <section className="panel-section">
                <div className="section-title">
                  <h2>용지</h2>
                </div>
                <label className="stacked-field">
                  용지 규격
                  <select
                    value={page.preset}
                    onChange={(event) =>
                      setPagePreset(event.target.value as PagePreset)
                    }
                  >
                    {Object.entries(PAGE_PRESETS).map(([key, preset]) => (
                      <option key={key} value={key}>
                        {preset.label}
                      </option>
                    ))}
                    <option value="custom">사용자 지정</option>
                  </select>
                </label>
                <div className="field-grid two-columns">
                  <label>
                    용지 너비
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="50"
                        step="0.1"
                        value={page.width}
                        onChange={(event) =>
                          setPage((current) => ({
                            ...current,
                            preset: "custom",
                            width: Number(event.target.value),
                          }))
                        }
                      />
                      <span>mm</span>
                    </div>
                  </label>
                  <label>
                    용지 높이
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="50"
                        step="0.1"
                        value={page.height}
                        onChange={(event) =>
                          setPage((current) => ({
                            ...current,
                            preset: "custom",
                            height: Number(event.target.value),
                          }))
                        }
                      />
                      <span>mm</span>
                    </div>
                  </label>
                </div>
                <button
                  type="button"
                  className="secondary-button full-width"
                  onClick={() =>
                    setPage((current) => ({
                      ...current,
                      width: current.height,
                      height: current.width,
                    }))
                  }
                >
                  가로·세로 방향 바꾸기
                </button>
              </section>

              <section className="panel-section">
                <div className="section-title">
                  <h2>배치 간격</h2>
                  <span>자동 중앙 정렬</span>
                </div>
                <div className="field-grid two-columns">
                  <label>
                    가로 간격
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={page.gapX}
                        onChange={(event) =>
                          setPage((current) => ({
                            ...current,
                            gapX: Math.max(0, Number(event.target.value)),
                          }))
                        }
                      />
                      <span>mm</span>
                    </div>
                  </label>
                  <label>
                    세로 간격
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={page.gapY}
                        onChange={(event) =>
                          setPage((current) => ({
                            ...current,
                            gapY: Math.max(0, Number(event.target.value)),
                          }))
                        }
                      />
                      <span>mm</span>
                    </div>
                  </label>
                </div>
                <div className="layout-result">
                  <span>
                    {layout.columns}열 × {layout.rows}행
                  </span>
                  <strong>한 장에 {layout.capacity}개</strong>
                </div>
              </section>

              <section className="panel-section">
                <div className="section-title">
                  <h2>재단 표시</h2>
                </div>
                <label className="switch-row">
                  <span>
                    <strong>외곽선</strong>
                    <small>명찰 테두리를 얇게 표시</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={page.showOutline}
                    onChange={(event) =>
                      setPage((current) => ({
                        ...current,
                        showOutline: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="switch-row">
                  <span>
                    <strong>재단선</strong>
                    <small>모서리 바깥쪽에 절단 가이드 표시</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={page.showCropMarks}
                    onChange={(event) =>
                      setPage((current) => ({
                        ...current,
                        showCropMarks: event.target.checked,
                      }))
                    }
                  />
                </label>
              </section>

              <section className="panel-section">
                <div className="section-title">
                  <h2>PDF 품질</h2>
                </div>
                <label className="stacked-field">
                  이미지 해상도
                  <select
                    value={dpi}
                    onChange={(event) => setDpi(Number(event.target.value))}
                  >
                    <option value="150">150 DPI · 초안</option>
                    <option value="300">300 DPI · 인쇄 권장</option>
                    <option value="600">600 DPI · 고품질</option>
                  </select>
                </label>
              </section>

              <div className="export-summary">
                <div>
                  <span>명찰 {rows.length}개</span>
                  <span>PDF {pageCount}페이지</span>
                </div>
                <button
                  className="primary-button full-width export-button"
                  type="button"
                  onClick={exportPdf}
                  disabled={isExporting || !layout.fits}
                >
                  <Download size={18} />
                  {isExporting ? "PDF 만드는 중…" : "인쇄용 PDF 다운로드"}
                </button>
                <p>
                  다운로드한 PDF는 인쇄 창에서 <strong>실제 크기 100%</strong>로
                  출력하세요.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
