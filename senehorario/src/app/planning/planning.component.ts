import { Component, OnInit, OnDestroy } from "@angular/core";
import { CourseService } from "../services/course.service";
import { CourseModel } from "../models/course-model";
import { ScheduleService } from "../services/schedule.service";
import { SectionModel } from "../models/section-model";
import { ChangeDetectorRef } from "@angular/core";
import { CalendarOptions } from "@fullcalendar/core/index.js";
import timeGridPlugin from "@fullcalendar/timegrid/index.js";
import dayGridPlugin from "@fullcalendar/daygrid/index.js";
import interactionPlugin from "@fullcalendar/interaction/index.js";
import esLocale from "@fullcalendar/core/locales/es";

@Component({
  standalone: false,
  selector: "app-planning",
  templateUrl: "./planning.component.html",
  styleUrls: ["./planning.component.css"],
})
export class PlanningComponent implements OnInit, OnDestroy {
  // --- Component state ---
  private calendarRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly storageKey = "planningState";
  searchQuery: string = ""; // searchQuery: User input for search
  courses: CourseModel[] = []; // courses: courses shown upon successful

  // Selected event shown on the side panel
  selectedEvent: SectionModel | null = null;

  sections: SectionModel[] = []; // Sections for each of the courses
  selectedSections: SectionModel[] = []; // Sectios manually selected by the user for their schedule
  scheduleOptions: any[] = []; // Schedule options generated
  /* scheduleOptionsTest = [
    // Schedule 1
    [
      {
        title: 'Class 1',
        start: '2025-07-28T11:00:00',
        end: '2025-07-28T12:00:00',
        color: '#ffe066',
        textColor: '#222',
      },
    ],
    // Schedule 2
    [
      {
        title: 'Class 2',
        start: '2025-07-29T16:00:00',
        end: '2025-07-29T17:00:00',
        color: '#ff8c00',
        textColor: '#222',
      },
    ],
  ]; */

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
  empty = false;
  error: string = "";
  ScheduleError: string = "";
  expandedCourses: { [code: string]: boolean } = {};

  calendarOptions: CalendarOptions = {
    plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
    locales: [esLocale],
    locale: "es",
    dayHeaderContent: (arg) => {
      const name = arg.date.toLocaleDateString("es-ES", { weekday: "long" });
      return name.charAt(0).toUpperCase() + name.slice(1);
    },
    initialDate: "2025-07-28", // Start date for the calendar
    height: 600,
    contentHeight: 600,
    initialView: "timeGridWeek",
    headerToolbar: false,
    slotMinTime: "06:00:00",
    slotMaxTime: "20:00:00",
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

  goToNextSchedule() {
    if (this.selectedScheduleIndex < this.scheduleOptions.length - 1) {
      this.selectedScheduleIndex++;
      this.updateCalendarEvents();
      this.persistState();
    }
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

  getSelectedCourseCodes(): string[] {
    return Object.keys(this.selectedSectionsByCourse);
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
      this.fetchSchedules();
    }
  }

  constructor(
    private courseService: CourseService,
    private scheduleService: ScheduleService,
    private cdr: ChangeDetectorRef,
  ) {}

  // Method to handle course selection
  toggleCourse(course: CourseModel): void {
    this.expandedCourses[course.code] = !this.expandedCourses[course.code];
    // Using truthy toggle also initializes the key the first time we open a course
  }

  getCicloLabel(section: any): string {
    if (section.ptrm === "8A") return "Primer Ciclo - 8A";
    if (section.ptrm === "8B") return "Segundo Ciclo - 8B";
    if (section.ptrm === "1") return "16 Semanas";
    return section.ptrm;
  }

  getIntersemetral(section: any): string {
    if (section.term === "202519") return "Intersemestral";
    return section.term;
  }

  // Method to handle course search input
  onSearchCourse(searchQuery: string): void {
    if (this.searchQuery.trim().length > 0) {
      this.loading = true; // Set loading state
      this.courseService.searchCourses(this.searchQuery).subscribe({
        next: (courses: CourseModel[]) => {
          this.courses = courses;
          this.loading = false; // Reset loading state
          this.empty = false;
          this.error = "";
          this.cdr.detectChanges(); // Ensure view updates
          console.log("Courses found:", courses);

          if (courses === null || courses.length === 0) {
            this.empty = true;
          }
        },
        error: (error) => {
          this.courses = []; // Clear courses on error
          console.error("Error fetching courses:", error);
          this.error =
            "La base de datos de la Universidad de los Andes tiene errores en los valores de los cursos. Por favor, inténtalo de nuevo más tarde cuando la universidad corrija este problema.";
          this.loading = false;
          this.empty = false; // Reset empty state
          this.cdr.detectChanges(); // Ensure view updates
        },
      });
    } else {
      this.courses = []; // Clear courses if search query is empty
      this.error = ""; // Clear any previous error message
      this.loading = false;
      this.cdr.detectChanges(); // Ensure view updates
      console.log("Search query is empty, clearing courses.");
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
      return;
    } else {
      console.log("Fetching schedules for sections:", sectionsPerCourse);
      this.scheduleService.getSchedules(sectionsPerCourse).subscribe({
        next: (schedules: SectionModel[][]) => {
          console.log("Schedules received:", schedules);

          if (!Array.isArray(schedules) || schedules.length === 0) {
            console.warn("No schedules found for the selected sections.");
            this.ScheduleError =
              "No se encontraron horarios compatibles para las secciones seleccionadas. Por favor, seleccione secciones diferentes o verifique si hay conflictos.";
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
          this.scheduleOptions = this.mapSchedulesToCalendarEvents(schedules);
          this.selectedScheduleIndex = 0; // Reset to first schedule
          this.updateCalendarEvents(); // Update calendar with the first schedule
          this.persistState();
          this.cdr.detectChanges(); // Ensure view updates
          console.log("Schedules fetched successfully:", schedules);
          console.log("Number of schedules:", schedules.length);
        },
        error: (error) => {
          console.error("Error fetching schedules:", error);
          this.ScheduleError =
            "Un error crítico ocurrió al generar horarios. Por favor, inténtalo de nuevo más tarde o envíame un mensaje a contact@camilomolina.dev.";
        },
      });
    }
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

    // Base week starts on July 28, 2025 (FullCalendar uses absolute dates)
    const baseWeek = new Date(2025, 6, 28); // July 28, 2025 (month is 0-based)

    function getDateForDay(baseDate: Date, dayOfWeek: number): Date {
      const date = new Date(baseDate);
      const currentDay = date.getDay();
      const diff = dayOfWeek - currentDay;
      date.setDate(date.getDate() + diff);
      return date;
    }

    function setTime(date: Date, time: string): Date {
      const [hours, minutes, seconds] = time.split(":").map(Number);
      date.setHours(hours, minutes, seconds || 0, 0);
      return date;
    }

    // Color palette for different sections
    const colorPalette = [
      "#67A6D4",
      "#A05DD4",
      "#E1A557",
      "#C78A6B",
      "#E1628B",
      "#9595FF",
      "#81BA6C",
      "#62E1C9",
    ];

    // Translate backend schedules into FullCalendar event objects
    return schedules.map((schedule: SectionModel[]) =>
      schedule.flatMap((section: SectionModel, idx: number) =>
        section.meetings.map((meeting) => {
          const dayNum = dayMap[meeting.day];
          const startDate = setTime(
            getDateForDay(baseWeek, dayNum),
            meeting.start,
          );
          const endDate = setTime(getDateForDay(baseWeek, dayNum), meeting.end);
          return {
            title: `
              <div class="fc-event-content-wrapper">
                <div class="fc-event-course">
                  ${(section as any).courseCode} - ${section.sectionId}
                </div>
                <div class="fc-event-title">
                  ${(section as any).courseTitle ?? ""}
                </div>
              </div>
            `,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            color: colorPalette[idx % colorPalette.length],
            textColor: "#222",
            extendedProps: {
              section: section,
              courseCode: (section as any).courseCode,
              courseTitle: (section as any).courseTitle,
              courseCredits: (section as any).courseCredits,
            },
          };
        }),
      ),
    );
  }

  // Method to check requirements before calling schedule service

  checkRequirement(courseCode: string, action: string) {
    console.log(`Checking requirements for course: ${courseCode}`);
    // Labs have a trailing 'T'. Keep track of main vs lab codes to enforce coupling.
    const isLab = courseCode.endsWith("T");
    const baseCourseCode = isLab ? courseCode.slice(0, -1) : courseCode;
    const labCode = isLab ? courseCode : courseCode + "T";

    // Helper: Is main course selected?
    const isMainSelected = !!this.selectedSectionsByCourse[baseCourseCode];
    // Helper: Is lab selected?
    const isLabSelected = !!this.selectedSectionsByCourse[labCode];

    if (isLab) {
      // LAB CASE
      if (action !== "removed") {
        // Adding lab: main course must be selected
        if (!isMainSelected) {
          this.ScheduleError = `Seleccionaste una sección de laboratorio para ${baseCourseCode}, debes seleccionar también el curso principal.`;
          this.cdr.detectChanges();
          return;
        }
      } else {
        // Removing lab: can't remove if main course is still selected
        if (isMainSelected) {
          this.ScheduleError = `No puedes eliminar el laboratorio para ${baseCourseCode} mientras el curso principal sigue seleccionado.`;
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
              this.cdr.detectChanges();
              return;
            }
          } else {
            // Removing main: can't remove if lab is still selected
            if (isLabSelected) {
              this.ScheduleError = `No puedes eliminar la clase principal ${courseCode} mientras el laboratorio sigue seleccionado.`;
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

  runApiTests = false; // Enable to run local API sanity checks on init
  ngOnInit() {
    this.restoreState();
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

      /*
      this.courseService.getSections('IIND2201').subscribe({
        next: (sections1: SectionModel[]) => {
          const SectionOne_CourseOne = sections1.find(
            (section) => section.nrc === '10876'
          );
          const SectionTwo_CourseOne = sections1.find(
            (section) => section.nrc === '10742'
          );
          let sectionsForCourse1: SectionModel[] = [];
          if (SectionOne_CourseOne)
            sectionsForCourse1.push(SectionOne_CourseOne);
          if (SectionTwo_CourseOne)
            sectionsForCourse1.push(SectionTwo_CourseOne);
          console.log(
            'SCHEDULE SERVICE TEST 1 - Sections for IIND2201:',
            sectionsForCourse1
          );

          // Now fetch the second course's sections
          this.courseService.getSections('IIND3400').subscribe({
            next: (sections2: SectionModel[]) => {
              const SectionOne_CourseTwo = sections2.find(
                (section) => section.nrc === '10752'
              );
              const SectionTwo_CourseTwo = sections2.find(
                (section) => section.nrc === '77779'
              );
              let sectionsForCourse2: SectionModel[] = [];
              if (SectionOne_CourseTwo)
                sectionsForCourse2.push(SectionOne_CourseTwo);
              if (SectionTwo_CourseTwo)
                sectionsForCourse2.push(SectionTwo_CourseTwo);
              console.log(
                'SCHEDULE SERVICE TEST 2 - Sections for IIND3400:',
                sectionsForCourse2
              );

              // Now both arrays are ready, build the payload and call the schedule service
              const sectionsPerCourse: SectionModel[][] = [
                sectionsForCourse1,
                sectionsForCourse2,
              ];

              console.log(
                'SCHEDULE SERVICE TEST 3 - All sections per course:',
                sectionsPerCourse
              );

              this.scheduleService.getSchedules(sectionsPerCourse).subscribe({
                next: (schedules: SectionModel[][]) => {
                  console.log(
                    'SCHEDULE SERVICE TEST 4 - Schedules:',
                    schedules
                  );
                  console.log(
                    'SCHEDULE SERVICE TEST 5 - Number of schedules:',
                    schedules.length
                  );
                },
                error: (error) => {
                  console.error('Error fetching schedules:', error);
                },
              });
            },
            error: (error) => {
              console.error('Error fetching sections for IIND3400:', error);
            },
          });
        },
        error: (error) => {
          console.error('Error fetching sections for IIND2201:', error);
        },
      }); */
    }
  }

  ngOnDestroy() {
    if (this.calendarRefreshInterval) {
      clearInterval(this.calendarRefreshInterval);
    }
  }
}
