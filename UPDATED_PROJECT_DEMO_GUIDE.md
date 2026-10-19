# SmartCampus: Comprehensive Project Demonstration Guide

This guide provides a structured walkthrough for demonstrating the SmartCampus platform to college evaluators, faculty reviewers, and stakeholders.

---

## 1. System Access & Personas

Open the web application in a modern browser at:
`http://localhost:3000`

### Demonstration Credentials

| Persona | Email / Identifier | Password | Primary Capabilities |
|---|---|---|---|
| **Super Admin** | `admin@campus.edu` | `Admin@123` | Emergency Center, Locations, Assets, Intelligence, Sustainability |
| **Faculty Member** | `arun.kumar@campus.edu` | `Faculty@123` | Facility Issue Reporting, Classroom Equipment Tracking |
| **Technician (Staff)** | `staff@campus.edu` | `Staff@123` | Real-time Work Orders, Maintenance Completion, Evidence Upload |
| **Student (Named)** | `sushma.r@campus.edu` | `Student@123` | Issue Reporting, Live Tracking, Verification & Rating |

---

## 2. Demonstration Flow: Step-by-Step

### ACT 1: Campus-Wide Location Management (Admin Command Center)
1. Log in as **Super Admin** (`admin@campus.edu` / `Admin@123`).
2. Navigate to the **📍 Campus Locations** tab.
3. Review the overview metrics: Total Locations, Active Coverage, Critical Infrastructure count.
4. Filter by category (e.g. `College Buses & Transport`, `Grounds & Sports Facilities`, `Main Gate & Security`).
5. Click **Add Campus Location**:
   - Create a new facility: `East Wing Substation - Transformer Room #2` (`UTILITY-EAST-02`).
   - Flag as **Critical Campus Infrastructure**.
6. Save and observe the new location appear in the directory.
7. Click the **Shield Alert** icon on any location to view real-time unresolved complaints mapped to that spot.

---

### ACT 2: Real-Time Incident Reporting with Subcategories (Student / Faculty)
1. In an incognito window or separate browser tab, log in as **Student** (`sushma.r@campus.edu` / `Student@123`).
2. Keep the **Admin Command Center** visible side-by-side.
3. On the Student Dashboard, click **Report Campus Issue**.
4. Test the Location Mode switch:
   - Toggle to **Campus Facility / Zone**.
   - Select an outdoor/transport facility (e.g. `College Bus #12` or `Main Campus Entrance & Security Post 1`).
5. Select category:
   - Notice subcategories dynamically appear (e.g. for Electrical: *Breaker Tripped*, *Short Circuit*, *Socket Burnt*).
6. Fill in title and description.
7. Submit the complaint.
8. **Real-time verification**: Observe the complaint instantaneously appear in the Admin Command Center **Complaints & Dispatch** queue without manual refresh!

---

### ACT 3: Emergency & SOS Dispatch Center (Admin View)
1. Switch to the Admin window and open the **🚨 Emergency & SOS** tab.
2. Observe active incidents, severity badges (`CRITICAL`, `HIGH`), and location tags.
3. Click **Report Emergency Alarm**:
   - Select Category: `ELECTRICAL_FIRE` or `WOMEN_SAFETY`.
   - Severity: `CRITICAL`.
   - Location: `Main Gate Security Post 1`.
4. Click **Broadcast Alert**:
   - Notice the automated SMS dispatch indicator showing queued dispatches to configured emergency coordinators (`9952911217`, `6382373918`).
5. Click **Acknowledge Incident** on the new alarm.
   - Enter responder name and containment notes.
6. Click **Assign Response Team**:
   - Assign to *Electrical Quick Response Team*.
7. Expand the **SMS Log** drawer to view verified carrier message tracking IDs.
8. Click **Resolve Incident**:
   - Enter post-incident resolution notes and observe the complete immutable audit timeline.

---

### ACT 4: Technician Work Order & Live Sync (Staff Persona)
1. Log in as **Technician** (`staff@campus.edu` / `Staff@123`).
2. Observe tasks dispatched to the technician's department.
3. Accept the task and upload repair evidence.
4. Resolve the ticket.
5. In the Student window, observe the ticket status update in real time to **Resolved**.
6. Student reviews the repair evidence and submits a 5-star verification rating.
