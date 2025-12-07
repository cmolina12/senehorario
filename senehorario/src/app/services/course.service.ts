import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CourseModel } from '../models/course-model';
import { SectionModel } from '../models/section-model';
import { environment } from '../../environments/environment'; // Adjust the import path as necessary

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private environment: string = environment.apiUrl;

  private apiUrl: string = `${this.environment}courses`;

  constructor(private http: HttpClient) {}

  // Search for courses by name
  searchCourses(query: string): Observable<CourseModel[]> {
    const wildcarded = query.trim().replace(/\s+/g, '%');
    // URL-encode the result
    const encoded = encodeURIComponent(wildcarded);
    return this.http.get<CourseModel[]>(
      `${this.apiUrl}/domain?nameInput=${encodeURIComponent(encoded)}`
    );
  }

  // Get sections for a specific course once the course is known by complete code (e.g., "IIND2201")
  getSections(courseCode: string): Observable<SectionModel[]> {
    return this.http.get<SectionModel[]>(
      `${this.apiUrl}/${courseCode}/sections`
    );
  }
}
