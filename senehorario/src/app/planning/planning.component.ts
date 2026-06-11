import { Component, OnInit, OnDestroy, computed, inject } from "@angular/core";
import { CourseService } from "../services/course.service";
import { CourseModel } from "../models/course-model";
import { ScheduleService } from "../services/schedule.service";
import { SectionModel } from "../models/section-model";
import { MeetingModel } from "../models/meeting-model";
import { ChangeDetectorRef } from "@angular/core";
import { CalendarOptions } from "@fullcalendar/core/index.js";
import timeGridPlugin from "@fullcalendar/timegrid/index.js";
import dayGridPlugin from "@fullcalendar/daygrid/index.js";
import interactionPlugin from "@fullcalendar/interaction/index.js";
import esLocale from "@fullcalendar/core/locales/es";
import { ThemeService } from "../services/theme.service";

@Component({
  standalone: false,
  selector: "app-planning",
  templateUrl: "./planning.component.html",
  styleUrls: ["./planning.component.css"],
})
export class PlanningComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  protected readonly theme = this.themeService.theme;
  protected readonly themeLabel = computed(() =>
    this.themeService.theme() === "dark" ? "Modo claro" : "Modo oscuro",
  );

  // --- Component state ---
  private calendarRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private resizeListener: (() => void) | null = null;
  private readonly storageKey = "planningState";
  searchQuery: string = "";
  profesorQuery: string = "";
  courses: CourseModel[] = []; // courses: courses shown upon successful

  // Selected event shown on the side panel
  selectedEvent: SectionModel | null = null;

  sections: SectionModel[] = []; // Sections for each of the courses
  selectedSections: SectionModel[] = []; // Sectios manually selected by the user for their schedule
  scheduleOptions: any[] = []; // Schedule options generated
  scheduleOptionsTest = [
    // Schedule 1
    [
      {
        title: "Class 1",
        start: "2025-07-28T11:00:00",
        end: "2025-07-28T12:00:00",
        color: "#ffe066",
        textColor: "#222",
      },
    ],
    // Schedule 2
    [
      {
        title: "Class 2",
        start: "2025-07-29T16:00:00",
        end: "2025-07-29T17:00:00",
        color: "#ff8c00",
        textColor: "#222",
      },
    ],
  ];

  selectedScheduleIndex = 0; // Start with the first schedule

  selectedSectionsByCourse: { [courseCode: string]: SectionModel[] } = {}; // Maps course code to an array of selected sections for that course
  selectedCoursesMeta: {
    [courseCode: string]: { title: string; credits: number };
  } = {}; // Maps course code to its meta info for display
  selectedEventInfo: {
    courseCode?: string;
    courseTitle?: string;
    courseCredits?: number;
  } | null = null;
  activeSelectedCourseCode: string | null = null;

  loading = false;
  loadingSchedules = false;
  empty = false;
  error: string = "";
  ScheduleError: string = "";
  expandedCourses: { [code: string]: boolean } = {};

  // --- CBU state ---
  allCbus: CourseModel[] = [];
  rawScheduleOptions: SectionModel[][] = [];
  loadingCbus = false;
  cbuError = "";
  cbuActiveFilters: string[] = [];
  cbuPtrmFilter = "";
  expandedCbuCourses: { [code: string]: boolean } = {};

  readonly cbuAttrFilters = [
    { code: "ECUR", label: "Tipo E" },
    { code: "EPSI", label: "Epsilon" },
    { code: "INGL", label: "Inglés" },
    { code: "VIRT", label: "Virtual" },
    { code: "SEMP", label: "Semi-presencial" },
  ];

  readonly cbuPtrmFilters = [
    { value: "8A", label: "Primer Ciclo" },
    { value: "8B", label: "Segundo Ciclo" },
    { value: "1", label: "16 Semanas" },
  ];

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
    locales: [esLocale],
    locale: "es",
    dayHeaderContent: (arg) => {
      const fullName = arg.date.toLocaleDateString("es-ES", {
        weekday: "long",
      });
      const capitalizedName =
        fullName.charAt(0).toUpperCase() + fullName.slice(1);

      // Check if we're on a small screen
      const isSmallScreen = window.innerWidth <= 768;

      if (isSmallScreen) {
        // Return abbreviated day names for small screens
        const abbreviations: { [key: string]: string } = {
          Lunes: "L",
          Martes: "M",
          Miércoles: "I",
          Jueves: "J",
          Viernes: "V",
          Sábado: "S",
          Domingo: "D",
        };
        return abbreviations[capitalizedName] || capitalizedName.charAt(0);
      }

      return capitalizedName;
    },
    initialDate: "2025-07-28", // Start date for the calendar
    height: 600,
    contentHeight: 600,
    initialView: "timeGridWeek",
    headerToolbar: false,
    slotMinTime: "06:00:00",
    slotMaxTime: "21:00:00",
    allDaySlot: false,
    dayHeaderFormat: { weekday: "long" }, // Short weekday format
    events: [], // Use the first schedule for initial display
    hiddenDays: [0], // Hide Sunday (0)
    slotDuration: "01:00:00", // 30-minute slots
    slotLabelInterval: "01:00", // label every 30 minutes
    slotLabelFormat: { hour: "2-digit", minute: "2-digit", hour12: true }, // e.g., 08:00, 08:30
    eventContent: function (arg) {
      return { html: arg.event.title };
    },
    eventClick: (arg) => {
      // Extract data stored on the event for quick detail rendering
      const extended = arg.event.extendedProps as any;
      this.selectedEvent = extended["section"] as SectionModel;
      this.selectedEventInfo = {
        courseCode:
          extended["courseCode"] || (this.selectedEvent as any)?.courseCode,
        courseTitle:
          extended["courseTitle"] || (this.selectedEvent as any)?.courseTitle,
        courseCredits:
          extended["courseCredits"] ||
          (this.selectedEvent as any)?.courseCredits,
      };
      this.cdr.detectChanges(); // Ensure view updates
    },
  };

  updateCalendarEvents() {
    const events =
      this.scheduleOptions[this.selectedScheduleIndex] &&
      Array.isArray(this.scheduleOptions[this.selectedScheduleIndex])
        ? this.scheduleOptions[this.selectedScheduleIndex]
        : [];
    // Replace the events list while preserving all handlers
    this.calendarOptions = {
      ...this.calendarOptions,
      events,
      eventClick: (arg) => {
        const extended = arg.event.extendedProps as any;
        this.selectedEvent = extended["section"] as SectionModel;
        this.selectedEventInfo = {
          courseCode:
            extended["courseCode"] || (this.selectedEvent as any)?.courseCode,
          courseTitle:
            extended["courseTitle"] || (this.selectedEvent as any)?.courseTitle,
          courseCredits:
            extended["courseCredits"] ||
            (this.selectedEvent as any)?.courseCredits,
        };
        this.cdr.detectChanges();
      },
    };
    console.log("Updated calendar events:", this.calendarOptions.events);
    this.cdr.detectChanges(); // Ensure view updates
  }

  goToPrevSchedule() {
    if (this.selectedScheduleIndex > 0) {
      this.selectedScheduleIndex--;
      this.updateCalendarEvents();
      this.persistState();
    }
  }

  get hasSelectedSections(): boolean {
    return Object.keys(this.selectedSectionsByCourse).length > 0;
  }

  get totalCredits(): number {
    return Object.values(this.selectedCoursesMeta).reduce(
      (sum, meta) => sum + (meta.credits || 0),
      0,
    );
  }

  goToNextSchedule() {
    if (this.selectedScheduleIndex < this.scheduleOptions.length - 1) {
      this.selectedScheduleIndex++;
      this.updateCalendarEvents();
      this.persistState();
    }
  }

  getDayLabel(day: string): string {
    const key = (day || "").toLowerCase().slice(0, 3);
    const map: { [abbr: string]: string } = {
      mon: "Lun",
      tue: "Mar",
      wed: "Mie",
      thu: "Jue",
      fri: "Vie",
      sat: "Sab",
      sun: "Dom",
    };
    return map[key] ?? day?.slice(0, 3) ?? "";
  }

  // Toggles a section inside a course and immediately re-checks lab/main requirements
  onSectionClick(course: CourseModel, section: SectionModel): void {
    console.log("Section selected:", section);
    let action: string = "";

    // Initialize the selected sections array for the course if it doesn't exist
    if (!this.selectedSectionsByCourse[course.code]) {
      this.selectedSectionsByCourse[course.code] = []; // Create a new array for this course
      this.selectedCoursesMeta[course.code] = {
        title: course.title,
        credits: course.credits,
      };
      console.log(`Initialized selected sections for course ${course.code}.`);
    }

    // Prevent duplicates (using nrc as unique id)
    if (
      !this.selectedSectionsByCourse[course.code].some(
        (s) => s.nrc === section.nrc,
      )
    ) {
      // s is a section in the array, any of them currently present for that code
      this.selectedSectionsByCourse[course.code].push(section);
      console.log(
        `Section ${section.nrc} added to course ${course.code}.`,
        this.selectedSectionsByCourse,
      );
    }
    // Remove if already selected
    else {
      this.selectedSectionsByCourse[course.code] =
        this.selectedSectionsByCourse[course.code].filter(
          (s) => s.nrc !== section.nrc,
        );
      console.log(
        `Section ${section.nrc} removed from course ${course.code}.`,
        this.selectedSectionsByCourse,
      );

      // Remove the whole course if no sections are selected after removal
      if (this.selectedSectionsByCourse[course.code].length === 0) {
        delete this.selectedSectionsByCourse[course.code];
        delete this.selectedCoursesMeta[course.code];
        console.log(
          `No sections left for course ${course.code}, removing it from selected sections.`,
          this.selectedSectionsByCourse,
        );
        action = "removed";
      }
    }

    // Run the schedule fetch after selection change
    this.checkRequirement(course.code, action);
    this.persistState();
  }

  isSectionSelected(courseCode: string, sectionNrc: string): boolean {
    const arr = this.selectedSectionsByCourse[courseCode];
    return Array.isArray(arr) && arr.some((s) => s.nrc === sectionNrc);
  }

  addAllSectionsFromCourse(course: CourseModel): void {
    if (!course.sections || course.sections.length === 0) return;

    // Initialize the selected sections array for the course if it doesn't exist
    if (!this.selectedSectionsByCourse[course.code]) {
      this.selectedSectionsByCourse[course.code] = [];
      this.selectedCoursesMeta[course.code] = {
        title: course.title,
        credits: course.credits,
      };
    }

    // Add all sections that are not already selected
    for (const section of course.sections) {
      if (
        !this.selectedSectionsByCourse[course.code].some(
          (s) => s.nrc === section.nrc,
        )
      ) {
        this.selectedSectionsByCourse[course.code].push(section);
      }
    }

    console.log(
      `Added all sections from course ${course.code}.`,
      this.selectedSectionsByCourse,
    );

    this.checkRequirement(course.code, "");
    this.persistState();
  }

  addAvailableSectionsFromCourse(course: CourseModel): void {
    if (!course.sections || course.sections.length === 0) return;

    // Filter sections that have available seats
    const availableSections = course.sections.filter(
      (section) => section.availableSeats > 0,
    );

    if (availableSections.length === 0) {
      console.log(
        `No sections with available seats for course ${course.code}.`,
      );
      return;
    }

    // Initialize the selected sections array for the course if it doesn't exist
    if (!this.selectedSectionsByCourse[course.code]) {
      this.selectedSectionsByCourse[course.code] = [];
      this.selectedCoursesMeta[course.code] = {
        title: course.title,
        credits: course.credits,
      };
    }

    // Add all available sections that are not already selected
    for (const section of availableSections) {
      if (
        !this.selectedSectionsByCourse[course.code].some(
          (s) => s.nrc === section.nrc,
        )
      ) {
        this.selectedSectionsByCourse[course.code].push(section);
      }
    }

    console.log(
      `Added all available sections from course ${course.code}.`,
      this.selectedSectionsByCourse,
    );

    this.checkRequirement(course.code, "");
    this.persistState();
  }

  removeAllSectionsFromCourse(course: CourseModel): void {
    if (!this.selectedSectionsByCourse[course.code]) return;

    // Remove all sections for this course
    delete this.selectedSectionsByCourse[course.code];
    delete this.selectedCoursesMeta[course.code];

    if (this.activeSelectedCourseCode === course.code) {
      this.activeSelectedCourseCode = null;
    }

    console.log(
      `Removed all sections from course ${course.code}.`,
      this.selectedSectionsByCourse,
    );

    if (!this.hasSelectedSections) {
      this.scheduleOptions = [];
      this.selectedEvent = null;
      this.selectedEventInfo = null;
      this.selectedScheduleIndex = 0;
      this.persistState();
      this.updateCalendarEvents();
      return;
    }

    this.persistState();
    this.checkRequirement(course.code, "removed");
  }

  getSelectedCourseCodes(): string[] {
    return Object.keys(this.selectedSectionsByCourse);
  }

  // Color palette for courses (matches university's official platform)
  private readonly colorPalette = [
    "#67A6D4",
    "#A05DD4",
    "#E1A557",
    "#C78A6B",
    "#E1628B",
    "#9595FF",
    "#81BA6C",
    "#62E1C9",
  ];

  // Get color for a course code by its index in selected courses (used in template for color indicators)
  getCourseColor(courseCode: string): string {
    const courseCodes = this.getSelectedCourseCodes();
    const idx = courseCodes.indexOf(courseCode);
    return this.colorPalette[idx % this.colorPalette.length];
  }

  removeSelectedSection(courseCode: string, section: SectionModel): void {
    const sections = this.selectedSectionsByCourse[courseCode];
    if (!Array.isArray(sections)) return;

    this.selectedSectionsByCourse[courseCode] = sections.filter(
      (s) => s.nrc !== section.nrc,
    );

    if (this.selectedSectionsByCourse[courseCode].length === 0) {
      delete this.selectedSectionsByCourse[courseCode];
      delete this.selectedCoursesMeta[courseCode];
      if (this.activeSelectedCourseCode === courseCode) {
        this.activeSelectedCourseCode = null;
      }
    }

    if (!this.hasSelectedSections) {
      this.scheduleOptions = [];
      this.selectedEvent = null;
      this.selectedEventInfo = null;
      this.selectedScheduleIndex = 0;
      this.persistState();
      this.updateCalendarEvents();
      return;
    }

    this.persistState();
    this.checkRequirement(courseCode, "removed");
  }

  private persistState(): void {
    if (typeof localStorage === "undefined") return;
    try {
      const state = {
        selectedSectionsByCourse: this.selectedSectionsByCourse,
        selectedCoursesMeta: this.selectedCoursesMeta,
        scheduleOptions: this.scheduleOptions,
        selectedScheduleIndex: this.selectedScheduleIndex,
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn("Could not save planning state to localStorage.", error);
    }
  }

  private restoreState(): void {
    if (typeof localStorage === "undefined") return;
    const savedState = localStorage.getItem(this.storageKey);
    if (!savedState) return;

    try {
      const parsed = JSON.parse(savedState);
      this.selectedSectionsByCourse = parsed.selectedSectionsByCourse || {};
      this.selectedCoursesMeta = parsed.selectedCoursesMeta || {};
      this.scheduleOptions = parsed.scheduleOptions || [];
      this.selectedScheduleIndex =
        typeof parsed.selectedScheduleIndex === "number"
          ? parsed.selectedScheduleIndex
          : 0;

      if (
        this.selectedScheduleIndex < 0 ||
        this.selectedScheduleIndex >= this.scheduleOptions.length
      ) {
        this.selectedScheduleIndex = 0;
      }

      if (this.scheduleOptions.length > 0) {
        this.updateCalendarEvents();
      }
    } catch (error) {
      console.warn(
        "Could not restore planning state from localStorage.",
        error,
      );
    }

    if (this.hasSelectedSections) {
      // Refresh schedules so restored sections always re-sync with backend data
      this.loadingSchedules = true;
      this.fetchSchedules();
    }
  }

  constructor(
    private courseService: CourseService,
    private scheduleService: ScheduleService,
    private cdr: ChangeDetectorRef,
  ) {}

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  // Method to handle course selection
  toggleCourse(course: CourseModel): void {
    this.expandedCourses[course.code] = !this.expandedCourses[course.code];
    // Using truthy toggle also initializes the key the first time we open a course
  } 

  getProfessorUrl(name: string): string {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    return `https://losestudiantes.com/uniandes/professors/${slug}`;
  }

  getCicloLabel(section: any): string {
    if (section.ptrm === "8A") return "Primer Ciclo - 8A";
    if (section.ptrm === "8B") return "Segundo Ciclo - 8B";
    if (section.ptrm === "1") return "16 Semanas";
    return section.ptrm;
  }

  getIntersemetral(section: any): string {
    if (section.term === "202519") return "Intersemestral";
    if (section.term === "202619") return "Intersemestral";
    return section.term;
  }

  searchForCourse(courseCode: string): void {
    this.searchQuery = courseCode;
    this.onSearchCourse(courseCode);
  }

  onSearchCourse(_searchQuery?: string): void {
    const hasName = this.searchQuery.trim().length > 0;
    const hasProfesor = this.profesorQuery.trim().length > 0;

    if (hasName || hasProfesor) {
      this.loading = true;
      this.courseService.searchCourses(this.searchQuery, this.profesorQuery).subscribe({
        next: (courses: CourseModel[]) => {
          this.courses = courses;
          this.loading = false;
          this.empty = false;
          this.error = "";
          this.cdr.detectChanges();

          if (courses === null || courses.length === 0) {
            this.empty = true;
          }
        },
        error: (error) => {
          this.courses = [];
          console.error("Error fetching courses:", error);
          this.error =
            "La base de datos de la Universidad de los Andes tiene errores en los valores de los cursos. Por favor, inténtalo de nuevo más tarde cuando la universidad corrija este problema.";
          this.loading = false;
          this.empty = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      this.courses = [];
      this.error = "";
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  // Method to fetch schedules based on selected sections

  fetchSchedules(): void {
    // Build payload for schedule service: array of sections per course
    const sectionsPerCourse: SectionModel[][] = Object.values(
      this.selectedSectionsByCourse,
    );
    const courseCodes = Object.keys(this.selectedSectionsByCourse);

    if (sectionsPerCourse.length === 0) {
      console.warn("No sections selected for scheduling.");
      this.loadingSchedules = false;
      return;
    } else {
      console.log("Fetching schedules for sections:", sectionsPerCourse);
      this.loadingSchedules = true;
      this.scheduleService.getSchedules(sectionsPerCourse).subscribe({
        next: (schedules: SectionModel[][]) => {
          console.log("Schedules received:", schedules);

          if (!Array.isArray(schedules) || schedules.length === 0) {
            console.warn("No schedules found for the selected sections.");
            this.ScheduleError =
              "No se encontraron horarios compatibles para las secciones seleccionadas. Por favor, seleccione secciones diferentes o verifique si hay conflictos.";
            this.loadingSchedules = false;
            this.cdr.detectChanges();
            return;
          }

          schedules.forEach((schedule) => {
            // Attach course metadata to sections so the calendar event can display it
            schedule.forEach((section, i) => {
              const meta = this.selectedCoursesMeta[courseCodes[i]];
              (section as any).courseCode = courseCodes[i];
              (section as any).courseTitle = meta?.title;
              (section as any).courseCredits = meta?.credits;
            });
          });

          this.selectedEvent = null; // Reset selected event when new schedules are fetched
          this.selectedEventInfo = null;
          this.ScheduleError = ""; // Clear any previous error message
          const mergedSchedules = this.mergeHalfSemesterPairs(schedules);
          this.rawScheduleOptions = mergedSchedules;
          this.scheduleOptions = this.mapSchedulesToCalendarEvents(mergedSchedules);
          this.selectedScheduleIndex = 0; // Reset to first schedule
          if (this.allCbus.length === 0 && !this.loadingCbus) {
            this.loadCBUs();
          }
          this.updateCalendarEvents(); // Update calendar with the first schedule
          this.persistState();
          this.loadingSchedules = false;
          this.cdr.detectChanges(); // Ensure view updates
          console.log("Schedules fetched successfully:", schedules);
          console.log("Number of schedules:", schedules.length);
        },
        error: (error) => {
          console.error("Error fetching schedules:", error);
          this.ScheduleError =
            "Un error crítico ocurrió al generar horarios. Por favor, inténtalo de nuevo más tarde o envíame un mensaje a contact@camilomolina.dev.";
          this.loadingSchedules = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  private mergeHalfSemesterPairs(schedules: SectionModel[][]): SectionModel[][] {
    const result: SectionModel[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < schedules.length; i++) {
      if (used.has(i)) continue;

      let mergedOption: SectionModel[] | null = null;

      for (let j = i + 1; j < schedules.length; j++) {
        if (used.has(j)) continue;
        const merged = this.tryMergeScheduleOptions(schedules[i], schedules[j]);
        if (merged) {
          mergedOption = merged;
          used.add(j);
          break;
        }
      }

      result.push(mergedOption ?? schedules[i]);
      used.add(i);
    }

    return result;
  }

  private tryMergeScheduleOptions(
    a: SectionModel[],
    b: SectionModel[],
  ): SectionModel[] | null {
    const inANotB = a.filter((s) => !b.some((t) => t.nrc === s.nrc));
    const inBNotA = b.filter((s) => !a.some((t) => t.nrc === s.nrc));

    if (inANotB.length !== 1 || inBNotA.length !== 1) return null;

    const sA = inANotB[0];
    const sB = inBNotA[0];

    if ((sA as any).courseCode !== (sB as any).courseCode) return null;

    const ptrmSet = new Set([sA.ptrm, sB.ptrm]);
    if (!ptrmSet.has("8A") || !ptrmSet.has("8B")) return null;

    return [...a, sB];
  }

  private mapSchedulesToCalendarEvents(schedules: SectionModel[][]): any[][] {
    const dayMap: { [key: string]: number } = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };

    const baseWeek = new Date(2025, 6, 28);

    function getDateForDay(baseDate: Date, dayOfWeek: number): Date {
      const date = new Date(baseDate);
      const diff = dayOfWeek - date.getDay();
      date.setDate(date.getDate() + diff);
      return date;
    }

    function setTime(date: Date, time: string): Date {
      const [hours, minutes, seconds] = time.split(":").map(Number);
      date.setHours(hours, minutes, seconds || 0, 0);
      return date;
    }

    const colorPalette = [
      "#67A6D4", "#A05DD4", "#E1A557", "#C78A6B",
      "#E1628B", "#9595FF", "#81BA6C", "#62E1C9",
    ];

    const buildEvents = (
      section: SectionModel,
      courseCode: string,
      bgColor: string,
      titleHtml: string,
      extraClasses: string[],
    ) =>
      section.meetings.map((meeting) => {
        const dayNum = dayMap[meeting.day];
        const startDate = setTime(getDateForDay(baseWeek, dayNum), meeting.start);
        const endDate = setTime(getDateForDay(baseWeek, dayNum), meeting.end);
        return {
          title: titleHtml,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          color: bgColor,
          textColor: "rgb(34, 34, 34)",
          classNames: extraClasses,
          extendedProps: {
            section,
            courseCode,
            courseTitle: (section as any).courseTitle,
            courseCredits: (section as any).courseCredits,
          },
        };
      });

    return schedules.map((schedule: SectionModel[]) => {
      const uniqueCourses = [
        ...new Set(schedule.map((s) => (s as any).courseCode as string)),
      ];

      // Group sections by course to detect same-course 8A+8B pairs
      const sectionsByCourse = new Map<string, SectionModel[]>();
      for (const sec of schedule) {
        const code = (sec as any).courseCode as string;
        if (!sectionsByCourse.has(code)) sectionsByCourse.set(code, []);
        sectionsByCourse.get(code)!.push(sec);
      }

      const allEvents: any[] = [];

      for (const [courseCode, sections] of sectionsByCourse) {
        const bgColor =
          colorPalette[uniqueCourses.indexOf(courseCode) % colorPalette.length];

        const s8A = sections.find((s) => s.ptrm === "8A");
        const s8B = sections.find((s) => s.ptrm === "8B");

        if (s8A && s8B) {
          // Same course, two ciclos → one combined event so they don't render side-by-side
          const combinedTitle = `
            <div class="fc-event-content-wrapper">
              <div class="fc-event-course">
                ${courseCode}
                <span class="event-ptrm-badge event-ptrm-8a">8A</span><span class="event-ptrm-badge event-ptrm-8b">8B</span>
              </div>
              <div class="fc-event-title">${(s8A as any).courseTitle ?? ""}</div>
            </div>
          `;
          allEvents.push(
            ...buildEvents(s8A, courseCode, bgColor, combinedTitle, ["ptrm-combined"]),
          );

          // Render any other sections of this course (e.g. ptrm='1') normally
          for (const sec of sections.filter((s) => s !== s8A && s !== s8B)) {
            const badge = `<span class="event-ptrm-badge">${sec.ptrm}</span>`;
            const title = `
              <div class="fc-event-content-wrapper">
                <div class="fc-event-course">${courseCode} - ${sec.sectionId}${badge}</div>
                <div class="fc-event-title">${(sec as any).courseTitle ?? ""}</div>
              </div>
            `;
            allEvents.push(...buildEvents(sec, courseCode, bgColor, title, []));
          }
        } else {
          // No same-course pair — render each section individually
          for (const sec of sections) {
            const ptrmBadge =
              sec.ptrm === "8A" || sec.ptrm === "8B"
                ? `<span class="event-ptrm-badge event-ptrm-${sec.ptrm.toLowerCase()}">${sec.ptrm}</span>`
                : "";
            const eventClasses =
              sec.ptrm === "8A"
                ? ["ptrm-8a"]
                : sec.ptrm === "8B"
                  ? ["ptrm-8b"]
                  : [];
            const title = `
              <div class="fc-event-content-wrapper">
                <div class="fc-event-course">${courseCode} - ${sec.sectionId}${ptrmBadge}</div>
                <div class="fc-event-title">${(sec as any).courseTitle ?? ""}</div>
              </div>
            `;
            allEvents.push(
              ...buildEvents(sec, courseCode, bgColor, title, eventClasses),
            );
          }
        }
      }

      return allEvents;
    });
  }

  // Method to check requirements before calling schedule service

  checkRequirement(courseCode: string, action: string) {
    this.loadingSchedules = true;
    console.log(`Checking requirements for course: ${courseCode}`);
    // Labs have a trailing 'T'. Keep track of main vs lab codes to enforce coupling.
    const isLab = courseCode.endsWith("T");
    const baseCourseCode = isLab ? courseCode.slice(0, -1) : courseCode;
    const labCode = isLab ? courseCode : courseCode + "T";

    // Helper: Is main course selected? (has at least one section)
    const isMainSelected =
      this.selectedSectionsByCourse[baseCourseCode]?.length > 0;
    // Helper: Is lab selected? (has at least one section)
    const isLabSelected = this.selectedSectionsByCourse[labCode]?.length > 0;

    if (isLab) {
      // LAB CASE
      if (action !== "removed") {
        // Adding lab: main course must be selected
        if (!isMainSelected) {
          this.ScheduleError = `Seleccionaste una sección de laboratorio para ${baseCourseCode}, debes seleccionar también el curso principal.`;
          this.loadingSchedules = false;
          this.cdr.detectChanges();
          return;
        }
      } else {
        // Removing lab: can't remove if main course is still selected AND no lab sections remain
        if (isMainSelected && !isLabSelected) {
          this.ScheduleError = `No puedes eliminar el laboratorio para ${baseCourseCode} mientras el curso principal sigue seleccionado.`;
          this.loadingSchedules = false;
          this.cdr.detectChanges();
          return;
        }
      }
      // No error, proceed
      this.ScheduleError = "";
      this.cdr.detectChanges();
      this.fetchSchedules();
      return;
    }

    // MAIN COURSE CASE
    this.courseService.searchCourses(labCode).subscribe({
      next: (courses: CourseModel[]) => {
        if (!Array.isArray(courses)) {
          console.log("Is null brother");
          this.cdr.detectChanges();
          this.fetchSchedules();
          return;
        }
        const labExists = courses.some((c) => c.code === labCode);

        if (labExists) {
          if (action !== "removed") {
            // Adding main: lab must be selected
            if (!isLabSelected) {
              this.ScheduleError = `La clase ${courseCode} tiene un laboratorio obligatorio, debe seleccionar una sección de ${labCode}.`;
              this.loadingSchedules = false;
              this.cdr.detectChanges();
              return;
            }
          } else {
            // Removing main: can't remove if lab is still selected AND no main sections remain
            if (isLabSelected && !isMainSelected) {
              this.ScheduleError = `No puedes eliminar la clase principal ${courseCode} mientras el laboratorio sigue seleccionado.`;
              this.loadingSchedules = false;
              this.cdr.detectChanges();
              return;
            }
          }
        }
        // No error, proceed
        this.ScheduleError = "";
        this.cdr.detectChanges();
        this.fetchSchedules();
      },
      error: () => {
        this.ScheduleError =
          "No se pudo verificar el requisito de laboratorio. Por favor, verifica si seleccionaste todas las secciones de laboratorio correspondientes a tus cursos.";
        this.cdr.detectChanges();
        this.fetchSchedules();
      },
    });
  }

  // --- CBU methods ---

  loadCBUs(): void {
    this.loadingCbus = true;
    this.cbuError = "";
    this.courseService.getCBUs().subscribe({
      next: (courses) => {
        this.allCbus = courses || [];
        this.loadingCbus = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cbuError =
          "No se pudieron cargar los CBUs. Por favor, intenta de nuevo.";
        this.loadingCbus = false;
        this.cdr.detectChanges();
      },
    });
  }

  private ptrmConflicts(ptrm1: string, ptrm2: string): boolean {
    if (ptrm1 === "1" || ptrm2 === "1") return true;
    return ptrm1 === ptrm2;
  }

  private meetingsOverlap(m1: MeetingModel, m2: MeetingModel): boolean {
    if (m1.day !== m2.day) return false;
    return m1.start < m2.end && m2.start < m1.end;
  }

  private isCbuSectionFitting(cbuSection: SectionModel): boolean {
    const schedule = this.rawScheduleOptions[this.selectedScheduleIndex];
    if (!schedule) return false;
    if (cbuSection.meetings.length === 0) return true;

    for (const schedSection of schedule) {
      if (!this.ptrmConflicts(cbuSection.ptrm, schedSection.ptrm)) continue;
      for (const m1 of cbuSection.meetings) {
        for (const m2 of schedSection.meetings) {
          if (this.meetingsOverlap(m1, m2)) return false;
        }
      }
    }
    return true;
  }

  get filteredFittingCBUs(): CourseModel[] {
    if (!this.rawScheduleOptions[this.selectedScheduleIndex]) return [];

    return this.allCbus
      .map((course) => ({
        ...course,
        sections: course.sections.filter((s) => {
          if (!this.isCbuSectionFitting(s)) return false;
          if (
            this.cbuActiveFilters.length > 0 &&
            !this.cbuActiveFilters.some((f) => s.attrs?.includes(f))
          )
            return false;
          if (this.cbuPtrmFilter && s.ptrm !== this.cbuPtrmFilter) return false;
          return true;
        }),
      }))
      .filter((course) => course.sections.length > 0);
  }

  get currentScheduleHasMergedSections(): boolean {
    const schedule = this.rawScheduleOptions[this.selectedScheduleIndex];
    if (!schedule || schedule.length < 2) return false;
    for (let i = 0; i < schedule.length; i++) {
      for (let j = i + 1; j < schedule.length; j++) {
        const sA = schedule[i];
        const sB = schedule[j];
        if ((sA as any).courseCode === (sB as any).courseCode) continue;
        const ptrmSet = new Set([sA.ptrm, sB.ptrm]);
        if (!ptrmSet.has("8A") || !ptrmSet.has("8B")) continue;
        for (const m1 of sA.meetings) {
          for (const m2 of sB.meetings) {
            if (this.meetingsOverlap(m1, m2)) return true;
          }
        }
      }
    }
    return false;
  }

  toggleCbuFilter(attr: string): void {
    const idx = this.cbuActiveFilters.indexOf(attr);
    if (idx >= 0) {
      this.cbuActiveFilters = this.cbuActiveFilters.filter((f) => f !== attr);
    } else {
      this.cbuActiveFilters = [...this.cbuActiveFilters, attr];
    }
  }

  setCbuPtrmFilter(ptrm: string): void {
    this.cbuPtrmFilter = this.cbuPtrmFilter === ptrm ? "" : ptrm;
  }

  toggleCbuCourse(course: CourseModel): void {
    this.expandedCbuCourses[course.code] = !this.expandedCbuCourses[course.code];
  }

  addCbuSection(course: CourseModel, section: SectionModel): void {
    this.onSectionClick(course, section);
  }

  getCbuAttrLabel(attr: string): string {
    const labels: { [key: string]: string } = {
      ECUR: "Tipo E",
      EPSI: "Epsilon",
      INGL: "Inglés",
      VIRT: "Virtual",
      SEMP: "Semi-presencial",
    };
    return labels[attr] || attr;
  }

  runApiTests = false; // Enable to run local API sanity checks on init
  ngOnInit() {
    this.restoreState();
    this.setupResizeListener();
    // FullCalendar sometimes misses change detection; refresh periodically
    this.calendarRefreshInterval = setInterval(() => {
      this.updateCalendarEvents();
    }, 1000);

    if (this.runApiTests) {
      this.courseService.searchCourses("CONTROL DE PRODUCCION").subscribe({
        next: (courses: CourseModel[]) => {
          console.log("COURSE SERVICE TEST 1 - Courses found:", courses);
        },
        error: (error) => {
          console.error("Error fetching courses:", error);
        },
      });

      this.courseService.getSections("IIND2201").subscribe({
        next: (sections: SectionModel[]) => {
          console.log(
            "COURSE SERVICE TEST 2 - Sections for IIND2201:",
            sections,
          );
        },
        error: (error) => {
          console.error("Error fetching sections:", error);
        },
      });

      // --- SCHEDULE SERVICE TEST ---

      this.courseService.getSections("IIND2201").subscribe({
        next: (sections1: SectionModel[]) => {
          const SectionOne_CourseOne = sections1.find(
            (section) => section.nrc === "10876",
          );
          const SectionTwo_CourseOne = sections1.find(
            (section) => section.nrc === "10742",
          );
          let sectionsForCourse1: SectionModel[] = [];
          if (SectionOne_CourseOne)
            sectionsForCourse1.push(SectionOne_CourseOne);
          if (SectionTwo_CourseOne)
            sectionsForCourse1.push(SectionTwo_CourseOne);
          console.log(
            "SCHEDULE SERVICE TEST 1 - Sections for IIND2201:",
            sectionsForCourse1,
          );

          // Now fetch the second course's sections
          this.courseService.getSections("IIND3400").subscribe({
            next: (sections2: SectionModel[]) => {
              const SectionOne_CourseTwo = sections2.find(
                (section) => section.nrc === "10752",
              );
              const SectionTwo_CourseTwo = sections2.find(
                (section) => section.nrc === "77779",
              );
              let sectionsForCourse2: SectionModel[] = [];
              if (SectionOne_CourseTwo)
                sectionsForCourse2.push(SectionOne_CourseTwo);
              if (SectionTwo_CourseTwo)
                sectionsForCourse2.push(SectionTwo_CourseTwo);
              console.log(
                "SCHEDULE SERVICE TEST 2 - Sections for IIND3400:",
                sectionsForCourse2,
              );

              // Now both arrays are ready, build the payload and call the schedule service
              const sectionsPerCourse: SectionModel[][] = [
                sectionsForCourse1,
                sectionsForCourse2,
              ];

              console.log(
                "SCHEDULE SERVICE TEST 3 - All sections per course:",
                sectionsPerCourse,
              );

              this.scheduleService.getSchedules(sectionsPerCourse).subscribe({
                next: (schedules: SectionModel[][]) => {
                  console.log(
                    "SCHEDULE SERVICE TEST 4 - Schedules:",
                    schedules,
                  );
                  console.log(
                    "SCHEDULE SERVICE TEST 5 - Number of schedules:",
                    schedules.length,
                  );
                },
                error: (error) => {
                  console.error("Error fetching schedules:", error);
                },
              });
            },
            error: (error) => {
              console.error("Error fetching sections for IIND3400:", error);
            },
          });
        },
        error: (error) => {
          console.error("Error fetching sections for IIND2201:", error);
        },
      });
    }
  }

  ngOnDestroy() {
    if (this.calendarRefreshInterval) {
      clearInterval(this.calendarRefreshInterval);
    }
    if (this.resizeListener) {
      window.removeEventListener("resize", this.resizeListener);
    }
  }

  private setupResizeListener() {
    let resizeTimeout: ReturnType<typeof setTimeout>;
    this.resizeListener = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Force calendar to re-render headers by updating the options
        this.calendarOptions = { ...this.calendarOptions };
        this.cdr.detectChanges();
      }, 150);
    };
    window.addEventListener("resize", this.resizeListener);
  }
}
