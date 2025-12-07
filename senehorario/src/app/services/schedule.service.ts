import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SectionModel } from '../models/section-model';
import { environment } from '../../environments/environment'; // Adjust the import path as necessary

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private environment: string = environment.apiUrl;
  private apiUrl: string = `${this.environment}schedules`;

  constructor(private http: HttpClient) {}

  getSchedules(
    sectionsPerCourse: SectionModel[][]
  ): Observable<SectionModel[][]> {
    return this.http.post<SectionModel[][]>(this.apiUrl, sectionsPerCourse);
  }
}
