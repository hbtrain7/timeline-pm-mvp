import { useState, useEffect, useRef } from "react";
import "./App.css";

const MONTHS = [
  "2026-01", "2026-02", "2026-03", "2026-04", "2026-05",
  "2026-06", "2026-07", "2026-08", "2026-09", "2026-10",
  "2026-11", "2026-12", "2027-01", "2027-02"
];

const TASK_COLORS = [
  "#FF6B6B", "#FF922B", "#FCC419", "#51CF66", "#339AF0", "#845EF7", "#F06595", "#868E96"
];

const INITIAL_TASKS = [
  {
    id: 1,
    title: "기초 설계",
    start: "2026-01-01",
    end: "2026-01-31",
    status: "done",
    assignee: "정우성",
    description: "프로젝트 초기 구조 및 데이터베이스 스키마 설계",
    color: "#51CF66",
    checklist: [
      { id: 101, text: "요구사항 분석", completed: true },
      { id: 102, text: "데이터 모델링", completed: true }
    ]
  },
  {
    id: 2,
    title: "UI 개발",
    start: "2026-03-01",
    end: "2026-07-15",
    status: "doing",
    assignee: "이정재",
    description: "React를 이용한 메인 대시보드 및 컴포넌트 개발",
    color: "#339AF0",
    checklist: [
      { id: 201, text: "Gantt 컴포넌트 구현", completed: true },
      { id: 202, text: "작업카드 스타일링", completed: false },
      { id: 203, text: "반응형 레이아웃 대응", completed: false }
    ]
  },
  {
    id: 3,
    title: "API 연동",
    start: "2026-08-01",
    end: "2026-10-15",
    status: "todo",
    assignee: "박해일",
    description: "백엔드 서비스 및 외부 데이터 소스 연동",
    color: "#FF922B",
    checklist: []
  }
];

export default function App() {
  // 초기 상태 로드: localStorage 확인 후 없으면 INITIAL_TASKS 사용
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("timeline_tasks");
      if (!saved) return INITIAL_TASKS;

      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_TASKS;
      // Migration: 숫자 인덱스를 날짜 문자열로 변환
      return parsed.map(task => {
        if (typeof task.start === 'number') {
          const startMonth = MONTHS[task.start];
          const endMonth = MONTHS[task.end];
          const lastDay = new Date(parseInt(endMonth.split('-')[0]), parseInt(endMonth.split('-')[1]), 0).getDate();
          return {
            ...task,
            start: `${startMonth}-01`,
            end: `${endMonth}-${String(lastDay).padStart(2, '0')}`
          };
        }
        return task;
      });
    } catch (e) {
      console.error("데이터 복구 실패:", e);
      return INITIAL_TASKS;
    }
  });
  const [isAddingModal, setIsAddingModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // 데이터 변경 시마다 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("timeline_tasks", JSON.stringify(tasks));
  }, [tasks]);

  // --- 오늘의 할일 (Daily Todo) 관련 상태 ---
  const [dailyTodos, setDailyTodos] = useState(() => {
    try {
      const saved = localStorage.getItem("daily_todos");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Daily Todo 복구 실패:", e);
      return {};
    }
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date("2026-01-27"));
  const [selectedDayTodo, setSelectedDayTodo] = useState(null); // YYYY-MM-DD

  useEffect(() => {
    localStorage.setItem("daily_todos", JSON.stringify(dailyTodos));
  }, [dailyTodos]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setIsAddingModal(false);
        setSelectedTaskId(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // 새 작업을 위한 임시 상태
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStart, setNewStart] = useState("2026-01-01");
  const [newEnd, setNewEnd] = useState("2026-01-07");
  const [newColor, setNewColor] = useState(TASK_COLORS[0]);

  // 날짜 범위 선택 모달 상태
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null); // 'new' or 'selected'
  const [startNavDate, setStartNavDate] = useState(new Date("2026-01-27"));
  const [endNavDate, setEndNavDate] = useState(new Date("2026-02-02"));
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [footerFilter, setFooterFilter] = useState("all"); // 'all', 'todo', 'doing', 'done'
  const [tooltipDir, setTooltipDir] = useState("right"); // 'right', 'left', 'top', 'bottom'
  const [tooltipAlign, setTooltipAlign] = useState("top"); // 'top', 'bottom'

  // 가이드 (Onboarding) 상태
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  const hoverTimeoutRef = useRef(null);

  const handleCardMouseEnter = (e, taskId) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTaskId(taskId);
      const rect = e.target.getBoundingClientRect(); // e.currentTarget 대신 e.target 혹은 캡처된 정보 사용 고려
      const spaceRight = window.innerWidth - rect.right;
      const spaceLeft = rect.left;
      const spaceBottom = window.innerHeight - rect.bottom;

      // 가로 방향 결정
      if (spaceRight > 260) setTooltipDir("right");
      else if (spaceLeft > 260) setTooltipDir("left");
      else setTooltipDir("bottom");

      // 세로 정렬 결정
      if (spaceBottom < 300 && rect.top > 300) {
        setTooltipAlign("bottom");
      } else {
        setTooltipAlign("top");
      }
    }, 150); // 150ms 디바운스
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredTaskId(null);
  };

  // 첫 방문 시 가이드 자동 표시
  useEffect(() => {
    const hasSeen = localStorage.getItem("timeline_seen_guide");
    if (!hasSeen) {
      setIsGuideOpen(true);
    }
  }, []);

  const closeGuide = () => {
    setIsGuideOpen(false);
    localStorage.setItem("timeline_seen_guide", "true");
  };

  const nextGuide = () => {
    if (guideStep < 4) setGuideStep(gs => gs + 1);
    else closeGuide();
  };

  const prevGuide = () => {
    if (guideStep > 0) setGuideStep(gs => gs - 1);
  };
  const calculateProgress = (checklist) => {
    if (!checklist || checklist.length === 0) return 0;
    const completedCount = checklist.filter(item => item.completed).length;
    return Math.round((completedCount / checklist.length) * 100);
  };

  const determineStatus = (progress) => {
    if (progress === 0) return "todo";
    if (progress === 100) return "done";
    return "doing";
  };

  const openAddModal = () => {
    if (tasks.length >= 50) {
      alert("작업카드는 최대 50개까지 생성할 수 있습니다.");
      return;
    }
    setNewTitle(`새 작업 ${tasks.length + 1}`);
    setNewDescription("");
    setNewStart("2026-01-27"); // 오늘 날짜 기준 기본값
    setNewEnd("2026-02-02");   // 일주일 뒤
    setNewColor(TASK_COLORS[tasks.length % TASK_COLORS.length]);
    setIsAddingModal(true);
  };

  const handleAddTask = () => {
    if (tasks.length >= 50) return;
    const newTask = {
      id: Date.now(),
      title: newTitle || "제목 없는 작업",
      start: newStart,
      end: newEnd,
      status: "todo",
      assignee: "미지정",
      description: newDescription, // 설명 추가 필드 반영
      color: newColor,
      checklist: []
    };
    setTasks([...tasks, newTask]);
    setIsAddingModal(false);
  };

  // 간트 차트 막대 높이 계산 로직
  // 고정 높이(약 260px) 내에서 개수에 따라 조절, 최소 높이 8px 보장
  const getBarHeight = () => {
    const minHeight = 8;
    const maxHeight = 32;
    const containerHeight = 260; // .gantt-body의 대략적인 높이
    if (tasks.length === 0) return maxHeight;
    const calculated = (containerHeight / tasks.length) - 8; // 8px는 간격(gap)
    return Math.max(minHeight, Math.min(maxHeight, calculated));
  };

  const barHeight = getBarHeight();

  // 차트 전체 시작/종료 시간 (MONTHS 기준)
  const chartStartDate = new Date(`${MONTHS[0]}-01`);
  const chartEndDate = new Date(parseInt(MONTHS[MONTHS.length - 1].split('-')[0]), parseInt(MONTHS[MONTHS.length - 1].split('-')[1]), 0);
  const totalChartDuration = chartEndDate - chartStartDate;

  const getDatePosition = (dateStr) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    const pos = ((date - chartStartDate) / totalChartDuration) * 100;
    return Math.max(0, Math.min(100, isNaN(pos) ? 0 : pos));
  };

  // 로우 패킹 알고리즘: 날짜 기준 정렬 및 충돌 체크
  const getPackedRows = () => {
    const sortedTasks = [...tasks].sort((a, b) => {
      const sA = (a.start || "").trim();
      const sB = (b.start || "").trim();
      if (sA !== sB) return sA.localeCompare(sB);

      const eA = (a.end || "").trim();
      const eB = (b.end || "").trim();
      return eA.localeCompare(eB);
    });
    const rows = [];

    sortedTasks.forEach(task => {
      let placed = false;
      const tStart = new Date(task.start);
      for (let row of rows) {
        const lastTaskInRow = row[row.length - 1];
        const lastEnd = new Date(lastTaskInRow.end);
        // 하루(86400000ms) 간격을 둠
        if (tStart >= lastEnd.getTime() + 86400000) {
          row.push(task);
          placed = true;
          break;
        }
      }
      if (!placed) {
        rows.push([task]);
      }
    });
    return rows;
  };

  const packedRows = getPackedRows();

  // 오늘 날짜 표시선 위치 계산 (2026-01-27 기준)
  const getTodayPosition = () => {
    const today = new Date("2026-01-27"); // 현재 시스텀 시간 기준
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const todayStr = `${year}-${String(month).padStart(2, '0')}`;

    const monthIdx = MONTHS.indexOf(todayStr);
    if (monthIdx === -1) return null;

    const daysInMonth = new Date(year, month, 0).getDate();
    const pos = ((monthIdx + (day - 1) / daysInMonth) / MONTHS.length) * 100;
    return pos;
  };

  const todayPos = getTodayPosition();

  const updateTask = (id, field, value) => {
    setTasks(prevTasks => prevTasks.map(t => {
      if (t.id === id) {
        let updatedTask = { ...t, [field]: value };

        // 체크리스트가 변경된 경우 진행도와 상태 자동 업데이트
        if (field === "checklist") {
          const progress = calculateProgress(value);
          updatedTask.status = determineStatus(progress);
        }

        return updatedTask;
      }
      return t;
    }));
  };

  const addChecklistItem = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task.checklist.length >= 30) {
      alert("체크리스트는 최대 30개까지 생성할 수 있습니다.");
      return;
    }
    const newItem = {
      id: Date.now(),
      text: "",
      completed: false
    };
    updateTask(taskId, "checklist", [...task.checklist, newItem]);
  };

  const toggleChecklistItem = (taskId, itemId) => {
    const task = tasks.find(t => t.id === taskId);
    const newChecklist = task.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateTask(taskId, "checklist", newChecklist);
  };

  const updateChecklistItemText = (taskId, itemId, text) => {
    const task = tasks.find(t => t.id === taskId);
    const newChecklist = task.checklist.map(item =>
      item.id === itemId ? { ...item, text: text } : item
    );
    updateTask(taskId, "checklist", newChecklist);
  };

  const removeChecklistItem = (taskId, itemId) => {
    const task = tasks.find(t => t.id === taskId);
    const newChecklist = task.checklist.filter(item => item.id !== itemId);
    updateTask(taskId, "checklist", newChecklist);
  };

  const removeTask = (id) => {
    if (window.confirm("정말 이 작업을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.")) {
      setTasks(tasks.filter(t => t.id !== id));
      setSelectedTaskId(null);
    }
  };

  // --- 오늘의 할일 (Daily Todo) 관련 함수 ---
  const changeMonth = (offset) => {
    const nextDate = new Date(currentCalendarDate);
    nextDate.setMonth(nextDate.getMonth() + offset);
    setCurrentCalendarDate(nextDate);
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // Sunday=0
    const lastDate = new Date(year, month + 1, 0).getDate();

    const days = [];
    // 이전 달 공백
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // 이번 달 날짜
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        day: i,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }
    return days;
  };

  const addDailyTodoItem = (dateStr) => {
    const newId = Date.now();
    const newItem = { id: newId, text: "", completed: false };
    setDailyTodos(prev => ({
      ...prev,
      [dateStr]: [...(prev[dateStr] || []), newItem]
    }));
  };

  const updateDailyTodoText = (dateStr, id, text) => {
    setDailyTodos(prev => ({
      ...prev,
      [dateStr]: prev[dateStr].map(item => item.id === id ? { ...item, text } : item)
    }));
  };

  const toggleDailyTodo = (dateStr, id) => {
    setDailyTodos(prev => ({
      ...prev,
      [dateStr]: prev[dateStr].map(item => item.id === id ? { ...item, completed: !item.completed } : item)
    }));
  };

  const removeDailyTodoItem = (dateStr, id) => {
    setDailyTodos(prev => ({
      ...prev,
      [dateStr]: prev[dateStr].filter(item => item.id !== id)
    }));
  };

  const getDailyProgress = (dateStr) => {
    const todos = dailyTodos[dateStr];
    if (!todos || todos.length === 0) return null;
    const completed = todos.filter(t => t.completed).length;
    return Math.round((completed / todos.length) * 100);
  };

  // --- 날짜 범위 선택기 전용 렌더링 함수 ---
  const renderPickerCalendar = (navDate, selectedDate, onSelect, onMonthChange) => {
    const days = getDaysInMonth(navDate);
    return (
      <div className="picker-calendar-view">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={() => onMonthChange(-1)}>◀</button>
          <h4>{navDate.getFullYear()}년 {navDate.getMonth() + 1}월</h4>
          <button className="nav-btn" onClick={() => onMonthChange(1)}>▶</button>
        </div>
        <div className="calendar-grid small">
          {["일", "월", "화", "수", "목", "금", "토"].map(d => (
            <div key={d} className="weekday">{d}</div>
          ))}
          {days.map((d, i) => (
            <div
              key={i}
              className={`calendar-day mini ${!d ? 'empty' : ''} ${selectedDate === d?.dateStr ? 'selected' : ''}`}
              onClick={() => d && onSelect(d.dateStr)}
            >
              {d && <span className="day-num">{d.day}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      {/* 상단 고정 바 */}
      <header className="top-bar">
        <div className="app-header">
          <h1 className="titleH1">Timeline PM</h1>
          <div className="subtitle">Project status board</div>
        </div>

        <div className="top-actions">
          <button className="btn btn-accent" onClick={() => setIsCalendarOpen(true)}>오늘의 할일</button>
          <div className="vline"></div>
          <button
            className="btn btn-guide-trigger"
            onClick={() => {
              console.log("Guide opening...");
              setGuideStep(0);
              setIsGuideOpen(true);
            }}
            title="사용 가이드"
            style={{ fontSize: '1.2rem', padding: '6px 12px', minWidth: '44px' }}
          >
            ❓
          </button>
          <button className="btn btn-primary" onClick={openAddModal}>+ 새 작업</button>
        </div>
      </header>

      {/* 작업카드 추가 모달 */}
      {isAddingModal && (
        <div className="modal-overlay" onClick={() => setIsAddingModal(false)}>
          <div className="modal-content add-modal-wide card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>새 작업카드 추가</h2>
              {/* x 버튼 삭제됨 */}
            </div>

            <div className="modal-body">
              <div className="add-form-container">
                <input
                  className="task-title-input highlight-input full-width"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="추가할 작업의 이름을 입력하세요"
                  autoFocus
                />

                <textarea
                  className="task-memo-input sophisticated full-width"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="작업에 대한 상세 메모나 설명을 여기에 자유롭게 기록하세요..."
                />
              </div>

              <div className="detail-section">
                <label>테마 색상</label>
                <div className="color-picker">
                  {TASK_COLORS.map(c => (
                    <button
                      key={c}
                      className={`color-dot ${newColor === c ? "active" : ""}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>

              <div className="detail-section">
                <label>일정 설정 (Daily Precision)</label>
                <button
                  className="btn btn-outline full-width"
                  onClick={() => { setPickerTarget('new'); setIsDatePickerOpen(true); }}
                  style={{ justifyContent: 'center', padding: '12px', fontSize: '1rem', fontWeight: '700' }}
                >
                  📅 {newStart} ~ {newEnd}
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setIsAddingModal(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleAddTask}>저장하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 정보 모달 (카드상세) */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTaskId(null)}>
          <div className="modal-content detail-modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <input
                className="task-title-input large"
                value={selectedTask.title}
                onChange={(e) => updateTask(selectedTask.id, "title", e.target.value)}
              />
              <button className="btn-close" onClick={() => setSelectedTaskId(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-split-layout">
                {/* 좌측 컬럼: 핵심 정보 및 메모 */}
                <div className="detail-left">
                  <div className="detail-section">
                    <label>테마 색상</label>
                    <div className="color-picker">
                      {TASK_COLORS.map(c => (
                        <button
                          key={c}
                          className={`color-dot ${selectedTask.color === c ? "active" : ""}`}
                          style={{ backgroundColor: c }}
                          onClick={() => updateTask(selectedTask.id, "color", c)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <label>작업 메모</label>
                    <textarea
                      className="task-memo-input"
                      value={selectedTask.description}
                      onChange={(e) => updateTask(selectedTask.id, "description", e.target.value)}
                      placeholder="중요한 내용을 기록해 보세요..."
                    />
                  </div>

                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>담당자</label>
                      <input
                        type="text"
                        value={selectedTask.assignee}
                        onChange={(e) => updateTask(selectedTask.id, "assignee", e.target.value)}
                      />
                    </div>
                    <div className="detail-item">
                      <label>진행도 ({calculateProgress(selectedTask.checklist)}%)</label>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${calculateProgress(selectedTask.checklist)}%`,
                            backgroundColor: selectedTask.color
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <label>일정 설정</label>
                    <button
                      className="btn btn-outline btn-sm full-width"
                      onClick={() => { setPickerTarget('selected'); setIsDatePickerOpen(true); }}
                      style={{ padding: '8px', justifyContent: 'center' }}
                    >
                      📅 {selectedTask.start} ~ {selectedTask.end} (변경)
                    </button>
                  </div>
                </div>

                {/* 우측 컬럼: 체크리스트 */}
                <div className="detail-right">
                  <div className="detail-section checklist-container full-height">
                    <div className="checklist-header">
                      <label>할일 목록</label>
                      <span className="checklist-count">{selectedTask.checklist.length} / 30</span>
                    </div>
                    <div className="checklist-items">
                      {selectedTask.checklist.map(item => (
                        <div key={item.id} className="checklist-item">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleChecklistItem(selectedTask.id, item.id)}
                          />
                          <input
                            type="text"
                            className={`checklist-text ${item.completed ? "completed" : ""}`}
                            value={item.text}
                            onChange={(e) => updateChecklistItemText(selectedTask.id, item.id, e.target.value)}
                            placeholder="할 일을 입력하세요"
                          />
                          <button className="btn-remove-item" onClick={() => removeChecklistItem(selectedTask.id, item.id)}>×</button>
                        </div>
                      ))}
                    </div>
                    {selectedTask.checklist.length < 30 && (
                      <button className="btn-add-item" onClick={() => addChecklistItem(selectedTask.id)}>
                        + 할일 추가
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-delete-text" onClick={() => removeTask(selectedTask.id)}>
                작업 삭제
              </button>
              <button className="btn btn-primary" onClick={() => setSelectedTaskId(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이 컨테이너가 모든 높이를 책임짐 */}
      <div className="main-layout">
        {/* 상단 1/3 : 간트 */}
        <main className="middle-area">
          <div className="gantt">
            <div className="timeline">
              <div className="gantt-header">
                {MONTHS.map((m) => (
                  <div key={m} className="month-cell">
                    {m}
                  </div>
                ))}
              </div>

              <div className="gantt-body">
                {/* 월 경계 그리드 라인 */}
                <div className="gantt-grid">
                  {MONTHS.map((m) => (
                    <div key={`grid-${m}`} className="grid-line" />
                  ))}
                </div>

                {packedRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="bar-track compact" style={{ height: `34px`, position: 'relative' }}>
                    {row.map((b) => {
                      const progress = calculateProgress(b.checklist);
                      const leftPos = getDatePosition(b.start);
                      const rightPos = getDatePosition(b.end);
                      const width = Math.max(2, rightPos - leftPos); // 최소 너비 보장

                      return (
                        <div
                          key={b.id}
                          className={`bar interactive ${hoveredTaskId === b.id ? 'hovered' : ''}`}
                          onClick={() => setSelectedTaskId(b.id)}
                          onMouseEnter={() => {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = setTimeout(() => setHoveredTaskId(b.id), 100);
                          }}
                          onMouseLeave={handleMouseLeave}
                          style={{
                            position: 'absolute',
                            left: `${leftPos}%`,
                            width: `${width}%`,
                            backgroundColor: `${b.color}33`,
                            boxShadow: `0 0 12px ${b.color}22`,
                            opacity: b.status === "done" ? 0.7 : 1,
                            height: `26px`,
                            border: `1px solid ${b.color}44`,
                            zIndex: 1
                          }}
                        >
                          <div className="bar-label">
                            <span className="bar-title text-truncate">{b.title}</span>
                            <span className="bar-progress">{progress}%</span>
                          </div>
                          {/* 진행률 배경 오버레이 */}
                          <div
                            className="bar-progress-bg"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: b.color,
                              borderRight: progress > 0 ? '2px solid rgba(255,255,255,0.5)' : 'none',
                              boxShadow: progress > 0 ? `0 0 8px ${b.color}` : 'none'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* 오늘 날짜 표시선 */}
                {todayPos !== null && (
                  <div className="today-marker" style={{ left: `${todayPos}%` }}>
                    <div className="today-pointer" />
                    <div className="today-line" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* 하단 2/3 : 필터 및 우선순위 목록 */}
        <footer className="bottom-area filter-prioritized-layout">
          <div className="bottom-header-actions">
            <div className="filter-group">
              <button className={`filter-btn ${footerFilter === "all" ? "active" : ""}`} onClick={() => setFooterFilter("all")}>전체보기</button>
              <button className={`filter-btn ${footerFilter === "todo" ? "active" : ""}`} onClick={() => setFooterFilter("todo")}>⏳ 대기 중</button>
              <button className={`filter-btn ${footerFilter === "doing" ? "active" : ""}`} onClick={() => setFooterFilter("doing")}>🚀 진행 중</button>
              <button className={`filter-btn ${footerFilter === "done" ? "active" : ""}`} onClick={() => setFooterFilter("done")}>✅ 완료됨</button>
            </div>
            <div className="footer-stats">
              <span>총 {tasks.length}개 작업</span>
            </div>
          </div>

          <div className="scrollable-cards-area">
            {/* 3단계 지능형 그룹 정렬 로직 */}
            {(() => {
              // 각 필터에 따른 그룹 순서 정의
              let groups = [];
              if (footerFilter === "all") {
                groups = [{ id: "all", label: "전체 작업 목록", filter: () => true }];
              } else if (footerFilter === "todo") {
                groups = [
                  { id: "todo", label: "우선순위: 대기 중", filter: (t) => t.status === "todo" },
                  { id: "doing", label: "진행 중", filter: (t) => t.status === "doing" },
                  { id: "done", label: "완료됨", filter: (t) => t.status === "done" }
                ];
              } else if (footerFilter === "doing") {
                groups = [
                  { id: "doing", label: "우선순위: 진행 중", filter: (t) => t.status === "doing" },
                  { id: "todo", label: "대기 중", filter: (t) => t.status === "todo" },
                  { id: "done", label: "완료됨", filter: (t) => t.status === "done" }
                ];
              } else if (footerFilter === "done") {
                groups = [
                  { id: "done", label: "우선순위: 완료됨", filter: (t) => t.status === "done" },
                  { id: "todo", label: "대기 중", filter: (t) => t.status === "todo" },
                  { id: "doing", label: "진행 중", filter: (t) => t.status === "doing" }
                ];
              }

              return groups.map((group, gIdx) => {
                const filteredTasks = tasks
                  .filter(group.filter)
                  .sort((a, b) => {
                    const startA = (a.start || "").trim();
                    const startB = (b.start || "").trim();
                    if (!startA) return 1;
                    if (!startB) return -1;
                    return startA.localeCompare(startB);
                  });

                if (filteredTasks.length === 0 && footerFilter === "all") return null;

                return (
                  <div key={group.id} className="status-group-section">
                    <div className="section-label">{group.label}</div>
                    <div className="task-grid-modern">
                      {filteredTasks.map(t => (
                        <div
                          key={t.id}
                          className={`task-card-modern-v2 ${hoveredTaskId === t.id ? 'hovered' : ''}`}
                          onClick={() => setSelectedTaskId(t.id)}
                          onMouseEnter={(e) => {
                            const target = e.currentTarget;
                            handleCardMouseEnter({ target }, t.id);
                          }}
                          onMouseLeave={handleMouseLeave}
                          style={{ borderTopColor: t.color, position: 'relative' }}
                        >
                          <div className="card-top">
                            <span className="card-title">{t.title}</span>
                            <span className="card-progress" style={{ color: t.color }}>{calculateProgress(t.checklist)}%</span>
                          </div>
                          <div className="card-meta">
                            <span className="card-assignee">{t.assignee}</span>
                            <span className="card-days">{t.start.slice(5)} ~ {t.end.slice(5)}</span>
                          </div>

                          {/* 체크리스트 툴팁 (오버창) */}
                          {hoveredTaskId === t.id && (
                            <div className={`checklist-tooltip ${tooltipDir} align-${tooltipAlign}`}>
                              <div className="tooltip-header">📌 남은 할 일</div>
                              <div className="tooltip-list">
                                {t.checklist?.filter(c => !c.completed).length > 0 ? (
                                  t.checklist.filter(c => !c.completed).map(c => (
                                    <div key={c.id} className="tooltip-item">
                                      <span className="bullet">☐</span> {c.text || "(내용 없음)"}
                                    </div>
                                  ))
                                ) : (
                                  <div className="tooltip-item empty">🎉 모든 일을 마쳤습니다!</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {group.id === "all" && tasks.length < 50 && (
                        <div className="add-task-placeholder-v2" onClick={openAddModal}>
                          <div className="add-icon">+</div>
                          <span>새 작업 추가</span>
                        </div>
                      )}
                      {filteredTasks.length === 0 && group.id !== "all" && (
                        <div className="empty-hint">해당 작업이 없습니다.</div>
                      )}
                    </div>
                    {gIdx < groups.length - 1 && <div className="section-divider" />}
                  </div>
                );
              });
            })()}
          </div>
        </footer>
      </div>

      {/* 오늘의 할일 캘린더 모달 */}
      {isCalendarOpen && (
        <div className="modal-overlay" onClick={() => { setIsCalendarOpen(false); setSelectedDayTodo(null); }}>
          <div className="modal-content calendar-modal-wide card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>오늘의 할일 관리</h2>
              <button className="btn-close" onClick={() => { setIsCalendarOpen(false); setSelectedDayTodo(null); }}>×</button>
            </div>

            <div className="modal-body calendar-layout">
              {/* 왼쪽: 캘린더 */}
              <div className="calendar-section">
                <div className="calendar-nav">
                  <button className="nav-btn" onClick={() => changeMonth(-1)}>◀</button>
                  <h3>{currentCalendarDate.getFullYear()}년 {currentCalendarDate.getMonth() + 1}월</h3>
                  <button className="nav-btn" onClick={() => changeMonth(1)}>▶</button>
                </div>
                <div className="calendar-grid">
                  {["일", "월", "화", "수", "목", "금", "토"].map(d => (
                    <div key={d} className="weekday">{d}</div>
                  ))}
                  {getDaysInMonth(currentCalendarDate).map((d, i) => (
                    <div
                      key={i}
                      className={`calendar-day ${!d ? 'empty' : ''} ${selectedDayTodo === d?.dateStr ? 'selected' : ''}`}
                      onClick={() => d && setSelectedDayTodo(d.dateStr)}
                    >
                      {d && (
                        <>
                          <span className="day-num">{d.day}</span>
                          {getDailyProgress(d.dateStr) !== null && (
                            <div className="mini-progress-track">
                              <div
                                className="mini-progress-fill"
                                style={{
                                  width: `${getDailyProgress(d.dateStr)}%`,
                                  backgroundColor: getDailyProgress(d.dateStr) === 100 ? '#51CF66' : '#FCC419'
                                }}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 오른쪽: 선택된 날짜의 할일 */}
              <div className="daily-todo-section">
                {selectedDayTodo ? (
                  <>
                    <div className="daily-todo-header">
                      <h4>{selectedDayTodo} 할일</h4>
                      <span className="todo-count">
                        {dailyTodos[selectedDayTodo]?.length || 0}개 항목
                      </span>
                    </div>
                    <div className="daily-todo-list">
                      {(dailyTodos[selectedDayTodo] || []).map(item => (
                        <div key={item.id} className="checklist-item">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleDailyTodo(selectedDayTodo, item.id)}
                          />
                          <input
                            type="text"
                            className={`checklist-text ${item.completed ? "completed" : ""}`}
                            value={item.text}
                            onChange={(e) => updateDailyTodoText(selectedDayTodo, item.id, e.target.value)}
                            placeholder="할 일을 입력하세요"
                          />
                          <button className="btn-remove-item" onClick={() => removeDailyTodoItem(selectedDayTodo, item.id)}>×</button>
                        </div>
                      ))}
                      <button className="btn-add-item" onClick={() => addDailyTodoItem(selectedDayTodo)}>
                        + 할일 추가
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="todo-empty-state">
                    날짜를 선택하여 할 일을 관리하세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 날짜 범위 선택기 모달 */}
      {isDatePickerOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
          <div className="modal-content date-picker-modal-wide card">
            <div className="modal-header">
              <h2>📅 일정 기간 선택</h2>
              <button className="btn-close" onClick={() => setIsDatePickerOpen(false)}>×</button>
            </div>
            <div className="modal-body dual-picker-body">
              <div className="picker-container">
                {/* 시작일 캘린더 */}
                <div className="picker-column">
                  <div className="picker-label-group">
                    <label>작업 시작일</label>
                    <span className="selected-date-display">{pickerTarget === 'new' ? newStart : selectedTask?.start}</span>
                  </div>
                  {renderPickerCalendar(
                    startNavDate,
                    pickerTarget === 'new' ? newStart : selectedTask?.start,
                    (date) => {
                      if (pickerTarget === 'new') setNewStart(date);
                      else if (selectedTask) updateTask(selectedTask.id, "start", date);
                    },
                    (offset) => {
                      const d = new Date(startNavDate);
                      d.setMonth(d.getMonth() + offset);
                      setStartNavDate(d);
                    }
                  )}
                </div>

                <div className="picker-v-line" />

                {/* 종료일 캘린더 */}
                <div className="picker-column">
                  <div className="picker-label-group">
                    <label>작업 종료일</label>
                    <span className="selected-date-display">{pickerTarget === 'new' ? newEnd : selectedTask?.end}</span>
                  </div>
                  {renderPickerCalendar(
                    endNavDate,
                    pickerTarget === 'new' ? newEnd : selectedTask?.end,
                    (date) => {
                      if (pickerTarget === 'new') setNewEnd(date);
                      else if (selectedTask) updateTask(selectedTask.id, "end", date);
                    },
                    (offset) => {
                      const d = new Date(endNavDate);
                      d.setMonth(d.getMonth() + offset);
                      setEndNavDate(d);
                    }
                  )}
                </div>
              </div>

              <div className="picker-footer combined">
                <div className="range-summary">
                  선택된 기간: <strong>{pickerTarget === 'new' ? newStart : selectedTask?.start}</strong> ~ <strong>{pickerTarget === 'new' ? newEnd : selectedTask?.end}</strong>
                  {(pickerTarget === 'new' ? newStart > newEnd : (selectedTask?.start > selectedTask?.end)) && (
                    <span className="range-warning">⚠️ 종료일이 시작일보다 빠릅니다!</span>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const s = pickerTarget === 'new' ? newStart : selectedTask?.start;
                    const e = pickerTarget === 'new' ? newEnd : selectedTask?.end;
                    if (s > e) {
                      alert("⚠️ 종료일은 시작일보다 앞설 수 없습니다.\n기간을 다시 확인해 주세요.");
                      return;
                    }
                    setIsDatePickerOpen(false);
                  }}
                >
                  설정 완료
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 입문자 가이드 모달 */}
      {isGuideOpen && (
        <div className="modal-overlay guide-overlay">
          <div className="modal-content guide-modal card">
            <div className="guide-header">
              <div className="step-dots">
                {[0, 1, 2, 3, 4].map(idx => (
                  <div key={idx} className={`dot ${guideStep === idx ? 'active' : ''}`} />
                ))}
              </div>
              <button className="btn-close" onClick={closeGuide}>×</button>
            </div>

            <div className="guide-body">
              {guideStep === 0 && (
                <div className="guide-slide">
                  <div className="guide-icon">📊</div>
                  <h2>자동 간트 차트 생성</h2>
                  <p>새 작업을 추가하고 기간을 설정하면,<br />상단 간트 차트의 해당 일정에 <b>자동으로 막대가 표시</b>되어 프로젝트 흐름을 시각화합니다.</p>
                </div>
              )}
              {guideStep === 1 && (
                <div className="guide-slide">
                  <div className="guide-icon">🔍</div>
                  <h2>지능형 하이라이트</h2>
                  <p>카드에 마우스를 올리면 <b>상단 간트 차트의 해당 막대가 즉시 부각</b>됩니다.<br />수많은 일정 속에서도 내가 찾는 작업을 직관적으로 식별할 수 있습니다.</p>
                </div>
              )}
              {guideStep === 2 && (
                <div className="guide-slide">
                  <div className="guide-icon">📝</div>
                  <h2>정교한 상세 관리</h2>
                  <p>카드를 클릭하여 <b>상세 할 일(체크리스트)</b>을 정의하세요.<br />항목을 완료할 때마다 실시간으로 진행률이 계산되어 반영됩니다.</p>
                </div>
              )}
              {guideStep === 3 && (
                <div className="guide-slide">
                  <div className="guide-icon">✍️</div>
                  <h2>오늘의 성과 기록</h2>
                  <p>상단의 <b>'오늘의 할일'</b> 버튼을 눌러 데일리 로그를 작성하세요.<br />매일의 작은 성취를 기록하고 캘린더에서 한눈에 모아볼 수 있습니다.</p>
                </div>
              )}
              {guideStep === 4 && (
                <div className="guide-slide">
                  <div className="guide-icon">🎯</div>
                  <h2>스마트 필터 & 정렬</h2>
                  <p>상태 필터를 통해 <b>우선순위 그룹</b>을 자유롭게 확인하세요.<br />모든 목록은 항상 시작일 순으로 정렬되어 최적의 관리 환경을 제공합니다.</p>
                </div>
              )}
            </div>

            <div className="guide-footer">
              <button className="btn" onClick={prevGuide} disabled={guideStep === 0}>이전</button>
              <button className="btn btn-primary" onClick={nextGuide}>
                {guideStep === 4 ? "시작하기" : "다음"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
