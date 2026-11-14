# PRD: School Therapy Scheduling App

## 1. Background and Problem

Special education teams in schools currently manage schedules in Excel. A therapist who serves a school must:

1. Look at the overall school master schedule
2. Look at each team member's individual schedule
3. Find gap for each student's schedule after blocking master schedule and other team members' schedule
4. Manually fill in their own schedule
5. Fit everything around the limited days they are on site

Every provider maintains their own spreadsheet, so the same information lives in many disconnected files. Finding an open time for a student means cross referencing several Excel sheets by hand. This is slow, error prone, and painful, especially when a therapist serves many students across multiple grades on only a few days per week.

## 2. Product Vision

A shared, calendar style scheduling app (similar in feel to Google Calendar) where multiple providers at one school can view and book time against student schedules. When a provider books a slot, the app blocks that time on both sides at once: the provider's calendar and every student assigned to that session. This built in cross check eliminates double booking without any manual reconciliation.

## 3. Guiding Principles

* **Simple over complete.** No complex login system, no per user permissions, no audit trails of who edited what. One school equals one account. Everyone at that school works inside the same shared workspace.
* **Privacy by design.** No student names ever enter the system. Students are referenced only by numeric IDs (Student 1, Student 2, Student 3). Each therapist keeps their own private ID to name mapping offline, outside the app, so confidentiality is preserved by default.
* **Visual first, automation second.** Phase 1 makes gaps visible so a human can schedule by eye. Phase 2 adds AI assisted schedule generation.

## 4. Users

* Primary user: the therapist (this is built for the author's own use)
* Secondary users: other providers on the special education team at the same school
* A typical school account contains 4 to 5 provider schedules

## 5. Core Concepts and Data Model

### 5.1 School Account

* One account per school
* Contains all provider schedules, all student schedules, and the school master schedule

### 5.2 Providers

* Each provider (therapist, specialist, etc.) has their own schedule inside the account
* Each provider has an availability pattern, for example "on site Tuesday and Friday only"
* Each provider is linked to the set of students they serve

### 5.3 Students

* Identified only by ID number, never by name
* Each student has their own calendar
* Each student is mapped to a grade, which determines which master schedule template applies to them
The system will allow manual change for each student schedule in their individual page 
Each student has a service minutes goal per provider, for example 90 minutes per month (used by Phase 2 scheduling)

### 5.4 School Master Schedule

* The school schedule is defined per grade: Grade 1 has one schedule, Grade 2 has another, and so on
* Each grade template marks fixed, unmovable time: recess, lunch, and classes that must not be missed
* The template supports both directions of definition, and either works:
  * Block out the times a student cannot be pulled, or
  * Mark the times a student is available and block everything else
* When a student is assigned to a grade, their calendar inherits that grade's blocked times automatically


## 6. Core Interaction: Two Sided Blocking (Cross Check)

This is the heart of the product.

* A provider may view several student calendars at once (for example, Students 1, 2, and 3 side by side)
* When the provider books a session, for example 10:00 to 10:30 with Students 1, 2, and 3:
  * That time is blocked on the provider's calendar
  * That same time is simultaneously blocked on each selected student's calendar
* One booking action updates both sides. No one can later double book that provider or those students in that slot.

## 7. The Result View: Gaps

After the master schedule blocks and all existing provider bookings are applied to a student's calendar, whatever remains is a **gap**. Gaps are the bookable times.

The final screen shows, for each student, a calendar where blocked time and gaps are visually distinct, so a therapist can scan and immediately see where sessions can go.

## 8. Phased Roadmap

### Phase 1: Visual Scheduling (MVP)

Goal: replace the Excel workflow with a single shared visual calendar. The therapist finds gaps by eye and books manually.

Scope:

1. One shared account per school (minimal or no login complexity)
2. Create and manage 4 to 5 provider schedules
3. Create students by ID and assign each to a grade
4. Define per grade master schedule templates (blocked or available time)
5. Student calendars auto inherit grade templates
6. View multiple student calendars together
7. Book a session against one or more students, with two sided blocking on the provider and every selected student
8. Clear visual distinction between blocked time and open gaps

Success criteria: a therapist can stop using Excel entirely, see all relevant schedules in one place, and manually build their weekly schedule without cross referencing files. And the therapist can formulate their own schedule and visualize it.

Phase 2: AI Assisted Schedule Generation (Advanced)

Goal: for a caseload of around 20 students, each with different gaps, automatically generate the therapist's schedule.

Scope:

Input the therapist's on site availability, for example Tuesday and Friday
Input each student's service minutes goal: the mandated amount of service time the therapist must deliver, for example Student 1 requires 90 minutes of service per month
Input grouping rules: the therapist assigns groups, for example "Student 1 and Student 2 together"
The AI finds time slots where all members of a group share a common gap
The AI fits all students and groups into the therapist's available days and generates a schedule that satisfies each student's service minutes goal, for example three 30 minute sessions per month for a 90 minute mandate
The AI flags any student whose service minutes goal cannot be fully met with the available gaps, so the therapist can resolve it manually
Track scheduled minutes against each student's goal, showing progress such as "Student 1: 60 of 90 minutes scheduled this month"
The therapist reviews, adjusts, and confirms; confirmed sessions apply two sided blocking as in Phase 1

This is the most complex part of the product and is intentionally deferred until Phase 1 is solid.

## 9. Explicit Non Goals

* No per user authentication, roles, or permissions
* No student names or personally identifiable student data in the system
* No edit attribution ("who changed what")
* No cross school features; each account is self contained

## 10. Open Questions

1. How should conflicts be handled if two providers try to book the same student slot at the same moment? This is not going to happen because there are priorities between providers. After one timeslot blocked, just cannot booked it.
2. Should master schedule templates support week A / week B rotations or other cycle types? school master schedule only have one type, no need week a or week b. but providers schedule can support week a or week b.
3. Session defaults: standard session length (for example 30 minutes), recurrence rules (weekly repeat)? the session should be 10, 15,20,25,30 mins length. each timeblock should be in 5 mins interval, it is repeated weekly. and sometimes biweekly depends on the schedule.
4. Should Phase 2 respect constraints like minimum spacing between a student's sessions in one day? yes it depends on user preference.
5. Service minutes goals: are they always monthly, or can they be weekly or yearly? Can a goal be split freely (three 30 minute sessions vs two 45 minute sessions), or does session length matter? it can be weekly, monthly, quarterly(two month), semesterly(4month), yearly. the goal can split between any number of sessions 15,20,30. 30 mins per session max.